import { Router } from "express";
import { computeSkillGap, CareerRequirementSchema, SkillSchema } from "@dhyavora/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";
import { recordModel } from "../records/model.js";

export const insightsRouter = Router();
function ready(res: import("express").Response) {
  if (databaseStatus().connected) return true;
  res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } }); return false;
}

insightsRouter.get("/today", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const uid = req.auth!.uid;
  const [roadmaps, applications, assessments, interviews, notifications] = await Promise.all([
    recordModel("roadmap").find({ userId: uid, deletedAt: null }).lean(),
    recordModel("application").find({ userId: uid, deletedAt: null }).lean(),
    recordModel("assessment-attempt").find({ userId: uid, deletedAt: null, "data.status": "IN_PROGRESS" }).lean(),
    recordModel("interview-session").find({ userId: uid, deletedAt: null, "data.status": "IN_PROGRESS" }).lean(),
    recordModel("notification").find({ userId: uid, deletedAt: null, "data.readAt": { $exists: false } }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const tasks = roadmaps.flatMap((row) => { const data = (row as unknown as { data: { tasks?: Array<Record<string, unknown>>; careerTitle?: string } }).data; return (data.tasks ?? []).filter((task) => task["status"] !== "COMPLETED").map((task) => ({ ...task, careerTitle: data.careerTitle })); });
  const today = new Date().toISOString().slice(0, 10);
  const due = applications.filter((row) => { const deadline = (row as unknown as { data: { deadline?: string } }).data.deadline; return deadline && deadline >= today && Date.parse(deadline) < Date.now() + 14 * 86400000; });
  res.json({ success: true, data: { roadmapTasks: tasks, upcomingApplications: due, activeAssessments: assessments, activeInterviews: interviews, notifications, counts: { roadmapTasks: tasks.length, applicationsDue: due.length, unreadNotifications: notifications.length } } });
}));

insightsRouter.get("/analytics", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const uid = req.auth!.uid;
  const [profile, roadmaps, attempts, projects, learning, progress, interviews, applications] = await Promise.all([
    recordModel("profile").findOne({ userId: uid, deletedAt: null }).lean() as Promise<{ data?: Record<string, unknown> } | null>,
    recordModel("roadmap").find({ userId: uid, deletedAt: null }).lean(), recordModel("assessment-attempt").find({ userId: uid, deletedAt: null, "data.status": "SUBMITTED" }).lean(),
    recordModel("project").countDocuments({ userId: uid, deletedAt: null }), recordModel("learning-resource").countDocuments({ userId: uid, deletedAt: null }),
    recordModel("resource-progress").countDocuments({ userId: uid, deletedAt: null }), recordModel("interview-session").countDocuments({ userId: uid, deletedAt: null }), recordModel("application").find({ userId: uid, deletedAt: null }).lean(),
  ]);
  let coverage = 0; let skillGap: ReturnType<typeof computeSkillGap> = [];
  const careerId = typeof profile?.data?.targetCareerId === "string" ? profile.data.targetCareerId : undefined;
  if (careerId) {
    const career = await recordModel("career").findOne({ _id: careerId, userId: { $in: [uid, "__catalog__"] }, deletedAt: null }).lean() as unknown as { data?: Record<string, unknown> } | null;
    const skills = SkillSchema.array().safeParse(profile?.data?.skills ?? []); const requirements = CareerRequirementSchema.array().safeParse(career?.data?.requiredSkills ?? []);
    if (skills.success && requirements.success) { skillGap = computeSkillGap(skills.data, requirements.data); coverage = skillGap.length ? Math.round(skillGap.filter((item) => item.status === "MATCHED").length * 100 / skillGap.length) : 0; }
  }
  const taskList = roadmaps.flatMap((row) => ((row as { data?: { tasks?: Array<{ status: string }> } }).data?.tasks ?? []));
  const scores = attempts.map((row) => Number((row as { data?: { result?: { score?: number } } }).data?.result?.score ?? 0));
  const statusCounts = new Map<string, number>(); applications.forEach((row) => { const status = String((row as { data?: { status?: string } }).data?.status ?? "saved"); statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1); });
  res.json({ success: true, data: { skillCoveragePercent: coverage, skills: skillGap, roadmap: { completed: taskList.filter((task) => task.status === "COMPLETED").length, total: taskList.length }, assessments: { completed: attempts.length, averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null }, learning: { resources: learning, progressEntries: progress }, projects, interviews, applications: Object.fromEntries(statusCounts), generatedAt: new Date().toISOString() } });
}));

insightsRouter.get("/learning/recommendations", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const uid = req.auth!.uid;
  const profile = await recordModel("profile").findOne({ userId: uid, deletedAt: null }).lean() as { data?: Record<string, unknown> } | null;
  const careerId = typeof profile?.data?.targetCareerId === "string" ? profile.data.targetCareerId : undefined;
  if (!careerId) return res.json({ success: true, data: { recommendations: [], reason: "Choose a target career first." } });
  const career = await recordModel("career").findOne({ _id: careerId, userId: { $in: [uid, "__catalog__"] }, deletedAt: null }).lean() as unknown as { data?: Record<string, unknown> } | null;
  const skills = SkillSchema.array().safeParse(profile?.data?.skills ?? []); const requirements = CareerRequirementSchema.array().safeParse(career?.data?.requiredSkills ?? []);
  if (!career || !skills.success || !requirements.success) return res.json({ success: true, data: { recommendations: [], reason: "A structured skill map is not available yet." } });
  const gaps = computeSkillGap(skills.data, requirements.data).filter((item) => item.status !== "MATCHED");
  const resources = await recordModel("learning-resource").find({ userId: uid, deletedAt: null }).sort({ updatedAt: -1 }).limit(100).lean();
  const recommendations = resources.filter((row) => { const data = (row as { data?: { skills?: unknown } }).data; const tags = Array.isArray(data?.skills) ? data.skills.map((skill) => String(skill).toLowerCase()) : []; return tags.some((tag) => gaps.some((gap) => gap.name.toLowerCase() === tag)); }).map((row) => ({ ...row, recommendation: "Matches a skill currently marked missing or developing in your career map." }));
  res.json({ success: true, data: { recommendations, reason: recommendations.length ? "Matched to your current skill gap." : "Add learning resources tagged to the skills you want to strengthen." } });
}));

insightsRouter.get("/notifications", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const rows = await recordModel("notification").find({ userId: req.auth!.uid, deletedAt: null }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: rows });
}));

insightsRouter.patch("/notifications/:id/read", requireAuth, asyncHandler(async (req, res) => {
  if (!ready(res)) return;
  const row = await recordModel("notification").findOneAndUpdate({ _id: req.params.id, userId: req.auth!.uid, deletedAt: null }, { $set: { "data.readAt": new Date().toISOString() } }, { new: true });
  if (!row) return res.status(404).json({ success: false, error: { code: "NOTIFICATION_NOT_FOUND", message: "The notification was not found." } });
  res.json({ success: true, data: row.toJSON() });
}));
