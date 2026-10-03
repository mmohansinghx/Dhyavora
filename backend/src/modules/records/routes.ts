import { Router } from "express";
import { z } from "zod";
import { recordModel, RESOURCE_KINDS } from "./model.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";

export const recordsRouter = Router();
recordsRouter.use(requireAuth);

const itemSchema = z.object({ title: z.string().trim().min(1).max(180), data: z.record(z.unknown()) }).strict().superRefine((item, ctx) => {
  for (const key of ["url", "sourceUrl", "repositoryUrl", "liveUrl"]) {
    const value = item.data[key];
    if (value === undefined || value === "") continue;
    let valid = false;
    try { const parsed = new URL(String(value)); valid = ["https:", "http:"].includes(parsed.protocol); } catch { valid = false; }
    if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data", key], message: "Use a valid HTTP or HTTPS URL." });
  }
  const deadline = item.data.deadline;
  if (deadline !== undefined && deadline !== "") {
    const value = String(deadline);
    const parsed = new Date(value);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!Number.isFinite(parsed.getTime()) || (dateOnly && parsed.toISOString().slice(0, 10) !== value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data", "deadline"], message: "Use a valid date." });
    }
  }
});
const writable = new Set(["profile", "project", "learning-resource", "resource-progress", "opportunity", "application"]);
const readOnly = new Set(["assessment", "assessment-attempt", "question", "notification", "analytics", "subscription", "payment", "audit-log", "github-connection", "resume-document", "interview-session"]);

function hasSystemVerified(value: unknown): boolean {
  if (typeof value === "string") return value.toUpperCase() === "SYSTEM_VERIFIED";
  if (Array.isArray(value)) return value.some(hasSystemVerified);
  if (value && typeof value === "object") return Object.entries(value).some(([key, entry]) => key.toUpperCase() === "SYSTEM_VERIFIED" || hasSystemVerified(entry));
  return false;
}

function requireDatabase(res: import("express").Response): boolean {
  if (databaseStatus().connected) return true;
  res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected. Configure MONGODB_URI and verify Atlas network access." } });
  return false;
}

recordsRouter.get("/:kind", asyncHandler(async (req, res) => {
  const kind = String(req.params.kind ?? "");
  if (!RESOURCE_KINDS.includes(kind)) return res.status(404).json({ success: false, error: { code: "UNKNOWN_RESOURCE", message: "This resource is not supported." } });
  if (!requireDatabase(res)) return;
  if (readOnly.has(kind)) return res.status(403).json({ success: false, error: { code: "READ_ONLY_RESOURCE", message: "Use the feature-specific API for this resource." } });
  const filter: Record<string, unknown> = { deletedAt: null };
  if (kind === "career") filter.userId = { $in: [req.auth!.uid, "__catalog__"] };
  else filter.userId = req.auth!.uid;
  const rows = await recordModel(kind).find(filter).sort({ updatedAt: -1 }).limit(100).lean();
  res.json({ success: true, data: rows });
}));

recordsRouter.post("/:kind", asyncHandler(async (req, res) => {
  const kind = String(req.params.kind ?? "");
  if (!RESOURCE_KINDS.includes(kind)) return res.status(404).json({ success: false, error: { code: "UNKNOWN_RESOURCE", message: "This resource is not supported." } });
  if (!requireDatabase(res)) return;
  if (!writable.has(kind)) return res.status(403).json({ success: false, error: { code: "READ_ONLY_RESOURCE", message: "This resource can only be changed through its dedicated workflow." } });
  const input = itemSchema.parse(req.body);
  if (hasSystemVerified(input.data)) return res.status(400).json({ success: false, error: { code: "INVALID_EVIDENCE", message: "Only the server may mark evidence as system verified." } });
  const data = { ...input.data };
  if (kind === "application" && typeof data.deadline === "string" && data.deadline) data.deadline = new Date(data.deadline).toISOString().slice(0, 10);
  const row = await recordModel(kind).create({ userId: req.auth!.uid, title: input.title, data });
  res.status(201).json({ success: true, data: row.toJSON() });
}));

recordsRouter.patch("/:kind/:id", asyncHandler(async (req, res) => {
  const kind = String(req.params.kind ?? "");
  const id = String(req.params.id ?? "");
  if (!RESOURCE_KINDS.includes(kind)) return res.status(404).json({ success: false, error: { code: "UNKNOWN_RESOURCE", message: "This resource is not supported." } });
  if (!requireDatabase(res)) return;
  if (!writable.has(kind)) return res.status(403).json({ success: false, error: { code: "READ_ONLY_RESOURCE", message: "This resource can only be changed through its dedicated workflow." } });
  const input = z.object({ title: z.string().trim().min(1).max(180).optional(), data: z.record(z.unknown()).optional() }).strict().parse(req.body);
  if (input.data) {
    for (const key of ["url", "sourceUrl", "repositoryUrl", "liveUrl"]) {
      const value = input.data[key]; if (value === undefined || value === "") continue;
      let valid = false; try { const parsed = new URL(String(value)); valid = ["https:", "http:"].includes(parsed.protocol); } catch { valid = false; }
      if (!valid) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Use a valid HTTP or HTTPS URL." } });
    }
    const deadline = input.data.deadline;
    if (deadline !== undefined && deadline !== "") {
      const value = String(deadline); const parsed = new Date(value); const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (!Number.isFinite(parsed.getTime()) || (dateOnly && parsed.toISOString().slice(0, 10) !== value)) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Use a valid date." } });
    }
  }
  if (input.data && hasSystemVerified(input.data)) return res.status(400).json({ success: false, error: { code: "INVALID_EVIDENCE", message: "Only the server may mark evidence as system verified." } });
  if (!Object.keys(input).length) return res.status(400).json({ success: false, error: { code: "EMPTY_UPDATE", message: "Provide a field to update." } });
  const update = { ...input, ...(input.data ? { data: { ...input.data } } : {}) };
  if (kind === "application" && update.data && typeof update.data.deadline === "string" && update.data.deadline) update.data.deadline = new Date(update.data.deadline).toISOString().slice(0, 10);
  const row = await recordModel(kind).findOneAndUpdate({ _id: id, userId: req.auth!.uid, deletedAt: null }, { $set: update }, { new: true, runValidators: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested item was not found." } });
  res.json({ success: true, data: row.toJSON() });
}));

recordsRouter.delete("/:kind/:id", asyncHandler(async (req, res) => {
  const kind = String(req.params.kind ?? "");
  const id = String(req.params.id ?? "");
  if (!RESOURCE_KINDS.includes(kind)) return res.status(404).json({ success: false, error: { code: "UNKNOWN_RESOURCE", message: "This resource is not supported." } });
  if (!requireDatabase(res)) return;
  if (!writable.has(kind)) return res.status(403).json({ success: false, error: { code: "READ_ONLY_RESOURCE", message: "This resource cannot be deleted here." } });
  const result = await recordModel(kind).updateOne({ _id: id, userId: req.auth!.uid, deletedAt: null }, { $set: { deletedAt: new Date() } });
  if (!result.modifiedCount) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested item was not found." } });
  res.json({ success: true, data: { deleted: true } });
}));

recordsRouter.post("/admin/careers", requireAdmin, asyncHandler(async (req, res) => {
  if (!requireDatabase(res)) return;
  const input = itemSchema.parse(req.body);
  const row = await recordModel("career").create({ userId: "__catalog__", title: input.title, data: input.data });
  res.status(201).json({ success: true, data: row.toJSON() });
}));
