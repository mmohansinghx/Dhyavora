import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";
import { recordModel } from "../records/model.js";
import { ResumeParserRegistry } from "./parser.js";
import { resumeStorageProvider } from "../integrations/storage.js";

export const resumeRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => {
  if (["application/pdf", "text/plain"].includes(file.mimetype)) callback(null, true);
  else callback(new Error("Only PDF and plain text resumes are supported."));
} });
const parser = new ResumeParserRegistry();

resumeRouter.get("/resumes", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const rows = await recordModel("resume-document").find({ userId: req.auth!.uid, deletedAt: null }).sort({ createdAt: -1 }).limit(30).lean();
  res.json({ success: true, data: rows.map((row) => { const data = (row as unknown as { data: Record<string, unknown> }).data; return { ...row, data: { ...data, extractedText: undefined } }; }) });
}));

resumeRouter.post("/resumes", requireAuth, upload.single("file"), asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const storage = resumeStorageProvider();
  if (!storage) return res.status(503).json({ success: false, error: { code: "STORAGE_NOT_CONFIGURED", message: "Resume storage is unavailable. Connect MongoDB or configure Firebase Storage." } });
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, error: { code: "FILE_REQUIRED", message: "Choose a PDF or plain text resume file." } });
  if (!parser.supports(file.mimetype)) return res.status(400).json({ success: false, error: { code: "UNSUPPORTED_FILE", message: "The selected resume file type is not supported." } });
  if (file.mimetype === "application/pdf" && file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return res.status(400).json({ success: false, error: { code: "INVALID_PDF", message: "The selected file does not contain a PDF header." } });
  if (file.mimetype === "text/plain") {
    try { new TextDecoder("utf-8", { fatal: true }).decode(file.buffer); }
    catch { return res.status(400).json({ success: false, error: { code: "INVALID_TEXT", message: "Plain text resumes must use UTF-8 encoding." } }); }
  }
  const ext = file.mimetype === "application/pdf" ? "pdf" : "txt";
  const storagePath = `resumes/${req.auth!.uid}/${randomUUID()}.${ext}`;
  await storage.upload(storagePath, file.buffer, file.mimetype, req.auth!.uid);
  let extractedText = "";
  let parseState = "TEXT_EXTRACTED";
  try { extractedText = await parser.extractText(file.mimetype, file.buffer); }
  catch { parseState = "PARSER_FAILED"; }
  const input = z.object({ label: z.string().trim().max(100).optional() }).parse(req.body ?? {});
  const filename = file.originalname.replace(/[\\/\u0000-\u001f]/g, "").slice(0, 180) || `resume.${ext}`;
  const row = await recordModel("resume-document").create({ userId: req.auth!.uid, title: input.label || filename, data: {
    filename, mimeType: file.mimetype,
    sizeBytes: file.size, storagePath, parseState, extractedCharacterCount: extractedText.length,
    // The caller receives the extracted text for review; only the storage path and metadata are persisted.
  } });
  res.status(201).json({ success: true, data: { id: row.id, title: row.get("title"), storagePath, parseState, extractedCharacterCount: extractedText.length, extractedText } });
}));

resumeRouter.get("/resumes/:id/content", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const { id } = z.object({ id: z.string().regex(/^[\da-f]{24}$/i) }).parse(req.params);
  const row = await recordModel("resume-document").findOne({ _id: id, userId: req.auth!.uid, deletedAt: null }).lean() as unknown as { data: { storagePath: string; mimeType: string; filename: string } } | null;
  if (!row) return res.status(404).json({ success: false, error: { code: "RESUME_NOT_FOUND", message: "The resume was not found." } });
  const storage = resumeStorageProvider();
  if (!row.data.storagePath.startsWith(`resumes/${req.auth!.uid}/`) || !storage) return res.status(403).json({ success: false, error: { code: "STORAGE_PATH_INVALID", message: "This document cannot be read from the configured storage." } });
  const contents = await storage.download(row.data.storagePath);
  const extractedText = await parser.extractText(row.data.mimeType, contents);
  res.json({ success: true, data: { filename: row.data.filename, extractedText, extractedCharacterCount: extractedText.length } });
}));

resumeRouter.patch("/resumes/:id/structured", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const { id } = z.object({ id: z.string().regex(/^[\da-f]{24}$/i) }).parse(req.params);
  const structured = z.object({ fullName: z.string().max(120).optional(), email: z.string().email().optional(), skills: z.array(z.string().trim().min(1).max(80)).max(100).default([]), experience: z.array(z.object({ title: z.string().max(160), organization: z.string().max(160).optional(), description: z.string().max(2000).optional() })).max(30).default([]), education: z.array(z.object({ institution: z.string().max(180), degree: z.string().max(160).optional(), year: z.string().max(40).optional() })).max(20).default([]) }).strict().parse(req.body);
  const row = await recordModel("resume-document").findOneAndUpdate({ _id: id, userId: req.auth!.uid, deletedAt: null }, { $set: { "data.structuredResume": structured } }, { new: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "RESUME_NOT_FOUND", message: "The resume document was not found." } });
  res.json({ success: true, data: { id: row.id, structuredResume: structured } });
}));
