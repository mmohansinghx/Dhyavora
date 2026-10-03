import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";
import { recordModel } from "../records/model.js";

export const collaborationRouter = Router();
const oid = z.string().regex(/^[\da-f]{24}$/i);
function ready(res: import("express").Response) { if (databaseStatus().connected) return true; res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } }); return false; }

collaborationRouter.get("/mentors", requireAuth, asyncHandler(async (_req, res) => {
  if (!ready(res)) return;
  const mentors = await recordModel("mentor").find({ userId: "__catalog__", deletedAt: null, "data.published": true }).sort({ title: 1 }).limit(100).lean();
  res.json({ success: true, data: mentors });
}));

collaborationRouter.post("/mentorship/requests", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const input = z.object({ mentorId: oid, availability: z.string().trim().min(1).max(200), message: z.string().trim().min(10).max(1500) }).strict().parse(req.body);
  const mentor = await recordModel("mentor").findOne({ _id: input.mentorId, userId: "__catalog__", deletedAt: null, "data.published": true }).lean() as unknown as { title: string } | null;
  if (!mentor) return res.status(404).json({ success: false, error: { code: "MENTOR_NOT_FOUND", message: "This mentor is not available for requests." } });
  const row = await recordModel("mentor-session").create({ userId: req.auth!.uid, title: `Mentorship with ${mentor.title}`, data: { mentorId: input.mentorId, mentorName: mentor.title, availability: input.availability, message: input.message, status: "REQUESTED", requestedAt: new Date().toISOString() } });
  res.status(201).json({ success: true, data: row.toJSON() });
}));

collaborationRouter.get("/community/feed", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const blocks = await recordModel("user-block").find({ userId: req.auth!.uid, deletedAt: null }).lean() as unknown as Array<{ data: { blockedUid: string } }>;
  const blocked = blocks.map((row) => row.data.blockedUid);
  const posts = await recordModel("community-post").find({ deletedAt: null, "data.visibility": "PUBLIC", "data.moderationStatus": "APPROVED", userId: { $nin: [req.auth!.uid, ...blocked] } }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: posts.map((row) => { const record = row as unknown as { _id: unknown; title: string; data: Record<string, unknown>; createdAt?: Date }; return { _id: record._id, title: record.title, data: record.data, createdAt: record.createdAt, author: "Community member" }; }) });
}));

collaborationRouter.get("/community/posts/mine", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const posts = await recordModel("community-post").find({ userId: req.auth!.uid, deletedAt: null }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: posts });
}));

collaborationRouter.post("/community/posts", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const input = z.object({ title: z.string().trim().min(3).max(180), body: z.string().trim().min(10).max(5000), topic: z.string().trim().max(80).optional() }).strict().parse(req.body);
  const row = await recordModel("community-post").create({ userId: req.auth!.uid, title: input.title, data: { body: input.body, topic: input.topic, visibility: "PUBLIC", moderationStatus: "PENDING", createdAt: new Date().toISOString() } });
  res.status(201).json({ success: true, data: row.toJSON() });
}));

collaborationRouter.post("/community/posts/:id/comments", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const { id } = z.object({ id: oid }).parse(req.params);
  const input = z.object({ body: z.string().trim().min(2).max(2000) }).strict().parse(req.body);
  const post = await recordModel("community-post").findOne({ _id: id, deletedAt: null, "data.visibility": "PUBLIC", "data.moderationStatus": "APPROVED" });
  if (!post) return res.status(404).json({ success: false, error: { code: "POST_NOT_FOUND", message: "This approved community post was not found." } });
  const row = await recordModel("community-comment").create({ userId: req.auth!.uid, title: "Community comment", data: { postId: id, body: input.body, moderationStatus: "PENDING" } });
  res.status(201).json({ success: true, data: row.toJSON() });
}));

collaborationRouter.get("/community/posts/:id/comments", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const { id } = z.object({ id: oid }).parse(req.params);
  const post = await recordModel("community-post").findOne({ _id: id, deletedAt: null, "data.visibility": "PUBLIC", "data.moderationStatus": "APPROVED" }).lean();
  if (!post) return res.status(404).json({ success: false, error: { code: "POST_NOT_FOUND", message: "This approved community post was not found." } });
  const rows = await recordModel("community-comment").find({ deletedAt: null, "data.postId": id, "data.moderationStatus": "APPROVED" }).sort({ createdAt: 1 }).limit(100).lean();
  res.json({ success: true, data: rows.map((row) => { const record = row as unknown as { _id: unknown; title: string; data: Record<string, unknown>; createdAt?: Date }; return { _id: record._id, title: record.title, data: record.data, createdAt: record.createdAt, author: "Community member" }; }) });
}));

collaborationRouter.post("/community/posts/:id/report", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const { id } = z.object({ id: oid }).parse(req.params);
  const input = z.object({ reason: z.enum(["SPAM", "HARASSMENT", "HARMFUL", "MISINFORMATION", "OTHER"]), details: z.string().trim().max(1500).optional() }).strict().parse(req.body);
  const post = await recordModel("community-post").findOne({ _id: id, deletedAt: null, "data.visibility": "PUBLIC" });
  if (!post) return res.status(404).json({ success: false, error: { code: "POST_NOT_FOUND", message: "The community post was not found." } });
  const row = await recordModel("community-report").create({ userId: req.auth!.uid, title: "Community report", data: { postId: id, reason: input.reason, details: input.details, status: "OPEN", reportedAt: new Date().toISOString() } });
  res.status(201).json({ success: true, data: { reportId: row.id, status: "OPEN" } });
}));

collaborationRouter.post("/community/blocks", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const input = z.object({ blockedUid: z.string().trim().min(1).max(128) }).strict().parse(req.body);
  if (input.blockedUid === req.auth!.uid) return res.status(400).json({ success: false, error: { code: "INVALID_BLOCK", message: "You cannot block your own account." } });
  await recordModel("user-block").findOneAndUpdate({ userId: req.auth!.uid, "data.blockedUid": input.blockedUid }, { $set: { title: "Blocked account", data: { blockedUid: input.blockedUid }, deletedAt: null } }, { upsert: true, new: true, runValidators: true });
  res.status(201).json({ success: true, data: { blocked: true } });
}));

collaborationRouter.delete("/community/blocks/:uid", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const uid = z.string().trim().min(1).max(128).parse(req.params.uid);
  await recordModel("user-block").updateOne({ userId: req.auth!.uid, "data.blockedUid": uid, deletedAt: null }, { $set: { deletedAt: new Date() } });
  res.json({ success: true, data: { unblocked: true } });
}));
