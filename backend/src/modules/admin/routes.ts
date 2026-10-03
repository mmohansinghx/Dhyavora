import { Router } from "express";
import { z } from "zod";
import { firebaseAuth } from "../../config/firebase.js";
import { databaseStatus } from "../../config/database.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { recordModel, RESOURCE_KINDS } from "../records/model.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
function ready(res: import("express").Response) { if (databaseStatus().connected) return true; res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } }); return false; }
async function audit(uid: string, action: string, target: string, details: Record<string, unknown> = {}) {
  await recordModel("audit-log").create({ userId: "__system__", title: action, data: { actorUid: uid, target, details, createdAt: new Date().toISOString() } });
}

adminRouter.get("/overview", asyncHandler(async (_req, res) => {
  if (!ready(res)) return;
  const kinds = ["profile", "career", "assessment", "question", "learning-resource", "opportunity", "community-post", "community-report", "mentor", "audit-log"];
  const counts = await Promise.all(kinds.map(async (kind) => [kind, await recordModel(kind).countDocuments({ deletedAt: null })] as const));
  res.json({ success: true, data: { records: Object.fromEntries(counts), moderationQueue: await recordModel("community-post").countDocuments({ deletedAt: null, "data.moderationStatus": "PENDING" }), openReports: await recordModel("community-report").countDocuments({ deletedAt: null, "data.status": "OPEN" }) } });
}));

adminRouter.get("/users", asyncHandler(async (_req, res) => {
  if (!ready(res)) return;
  const users = await recordModel("profile").find({ deletedAt: null }).sort({ updatedAt: -1 }).limit(500).lean() as unknown as Array<{ _id: unknown; userId: string; title: string; data: Record<string, unknown>; createdAt?: Date }>;
  res.json({ success: true, data: users.map((user) => ({ uid: user.userId, displayName: user.data.displayName ?? null, education: user.data.education ?? null, createdAt: user.createdAt })) });
}));

adminRouter.patch("/users/:uid/disable", asyncHandler(async (req, res) => {
  const { uid } = z.object({ uid: z.string().trim().min(1).max(128) }).parse(req.params);
  if (!firebaseAuth) return res.status(503).json({ success: false, error: { code: "FIREBASE_NOT_CONFIGURED", message: "Firebase Admin is required to disable accounts." } });
  if (uid === req.auth!.uid) return res.status(400).json({ success: false, error: { code: "SELF_DISABLE_FORBIDDEN", message: "Administrators cannot disable their own account." } });
  await firebaseAuth.updateUser(uid, { disabled: true });
  if (databaseStatus().connected) await audit(req.auth!.uid, "user.disabled", uid);
  res.json({ success: true, data: { disabled: true } });
}));

adminRouter.get("/catalog/:kind", asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const kind = String(req.params.kind ?? "");
  if (!RESOURCE_KINDS.includes(kind)) return res.status(404).json({ success: false, error: { code: "UNKNOWN_RESOURCE", message: "This catalog resource is not supported." } });
  const rows = await recordModel(kind).find({ userId: { $in: ["__catalog__", "__system__"] }, deletedAt: null }).sort({ updatedAt: -1 }).limit(500).lean();
  res.json({ success: true, data: rows });
}));

adminRouter.post("/catalog/:kind", asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const kind = String(req.params.kind ?? "");
  if (!["career", "assessment", "question", "learning-resource", "opportunity", "mentor"].includes(kind)) return res.status(403).json({ success: false, error: { code: "CATALOG_WRITE_FORBIDDEN", message: "This resource cannot be created in the shared catalog." } });
  const input = z.object({ title: z.string().trim().min(1).max(180), data: z.record(z.unknown()) }).strict().parse(req.body);
  if (kind === "career" && input.data.requiredSkills !== undefined) {
    const valid = z.array(z.object({ name: z.string().min(1).max(80), requiredLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]) })).safeParse(input.data.requiredSkills);
    if (!valid.success) return res.status(400).json({ success: false, error: { code: "INVALID_CAREER_SKILLS", message: "Career skill requirements use a name and requiredLevel." } });
  }
  const row = await recordModel(kind).create({ userId: "__catalog__", title: input.title, data: input.data });
  await audit(req.auth!.uid, "catalog.created", kind, { recordId: row.id });
  res.status(201).json({ success: true, data: row.toJSON() });
}));

adminRouter.patch("/catalog/:kind/:id", asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const kind = String(req.params.kind ?? "");
  const id = String(req.params.id ?? "");
  if (!["career", "assessment", "question", "learning-resource", "opportunity", "mentor"].includes(kind)) return res.status(403).json({ success: false, error: { code: "CATALOG_WRITE_FORBIDDEN", message: "This resource cannot be changed in the shared catalog." } });
  const input = z.object({ title: z.string().trim().min(1).max(180).optional(), data: z.record(z.unknown()).optional() }).strict().refine((data) => Object.keys(data).length > 0).parse(req.body);
  const row = await recordModel(kind).findOneAndUpdate({ _id: id, userId: "__catalog__", deletedAt: null }, { $set: input }, { new: true, runValidators: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "CATALOG_ITEM_NOT_FOUND", message: "The catalog item was not found." } });
  await audit(req.auth!.uid, "catalog.updated", kind, { recordId: id });
  res.json({ success: true, data: row.toJSON() });
}));

adminRouter.get("/moderation", asyncHandler(async (_req, res) => {
  if (!ready(res)) return;
  const [posts, comments, reports] = await Promise.all([
    recordModel("community-post").find({ deletedAt: null, "data.moderationStatus": "PENDING" }).sort({ createdAt: 1 }).limit(200).lean(),
    recordModel("community-comment").find({ deletedAt: null, "data.moderationStatus": "PENDING" }).sort({ createdAt: 1 }).limit(200).lean(),
    recordModel("community-report").find({ deletedAt: null, "data.status": "OPEN" }).sort({ createdAt: 1 }).limit(200).lean(),
  ]);
  res.json({ success: true, data: { posts, comments, reports } });
}));

adminRouter.patch("/moderation/:kind/:id", asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const params = z.object({ kind: z.enum(["community-post", "community-comment"]), id: z.string().regex(/^[\da-f]{24}$/i) }).parse(req.params);
  const input = z.object({ status: z.enum(["APPROVED", "REMOVED"]) }).strict().parse(req.body);
  const row = await recordModel(params.kind).findOneAndUpdate({ _id: params.id, deletedAt: null, "data.moderationStatus": "PENDING" }, { $set: { "data.moderationStatus": input.status, "data.moderatedBy": req.auth!.uid, "data.moderatedAt": new Date().toISOString() } }, { new: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "MODERATION_ITEM_NOT_FOUND", message: "This pending item was not found." } });
  await audit(req.auth!.uid, `moderation.${input.status.toLowerCase()}`, params.kind, { recordId: params.id });
  res.json({ success: true, data: row.toJSON() });
}));

adminRouter.patch("/reports/:id", asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const params = z.object({ id: z.string().regex(/^[\da-f]{24}$/i) }).parse(req.params);
  const input = z.object({ status: z.enum(["RESOLVED", "DISMISSED"]) }).strict().parse(req.body);
  const row = await recordModel("community-report").findOneAndUpdate({ _id: params.id, deletedAt: null, "data.status": "OPEN" }, { $set: { "data.status": input.status, "data.moderatorUid": req.auth!.uid, "data.resolvedAt": new Date().toISOString() } }, { new: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "REPORT_NOT_FOUND", message: "The open report was not found." } });
  await audit(req.auth!.uid, `report.${input.status.toLowerCase()}`, "community-report", { recordId: params.id });
  res.json({ success: true, data: row.toJSON() });
}));

adminRouter.get("/audit-logs", asyncHandler(async (_req, res) => {
  if (!ready(res)) return;
  const rows = await recordModel("audit-log").find({ userId: "__system__", deletedAt: null }).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: rows });
}));
