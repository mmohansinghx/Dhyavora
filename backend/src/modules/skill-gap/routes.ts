import { Router } from "express";
import { z } from "zod";
import { computeSkillGap, CareerRequirementSchema, SkillSchema, buildRoadmapPlan, projectCompletion, rankCareerMatches, skillLeverage, summarizeReadiness } from "@dhyavora/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";
import { recordModel } from "../records/model.js";

export const careerRouter = Router();
const objectId = z.string().regex(/^[\da-f]{24}$/i);

function unavailable(res: import("express").Response) {
  if (databaseStatus().connected) return false;
  res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  return true;
}

async function gapFor(uid: string, careerId?: string) {
  const profile = await recordModel("profile").findOne({ userId: uid, deletedAt: null }).lean() as { data?: Record<string, unknown> } | null;
  let career = careerId ? await recordModel("career").findOne({ _id: careerId, userId: { $in: [uid, "__catalog__"] }, deletedAt: null }).lean() : null;
  if (!career && profile?.data?.targetCareerId) {
    const targetId = String(profile.data.targetCareerId);
    if (objectId.safeParse(targetId).success) career = await recordModel("career").findOne({ _id: targetId, userId: { $in: [uid, "__catalog__"] }, deletedAt: null }).lean();
  }
  if (!career) return { profile, career: null, gap: [] };
  const careerRecord = career as unknown as { _id: { toString(): string }; title: string; data?: Record<string, unknown> };
  const userSkills = z.array(SkillSchema).safeParse(profile?.data?.skills ?? []);
  const requirements = z.array(CareerRequirementSchema).safeParse(careerRecord.data?.requiredSkills ?? []);
  return { profile, career: careerRecord, gap: userSkills.success && requirements.success ? computeSkillGap(userSkills.data, requirements.data) : [] };
}

careerRouter.get("/careers", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  const filter: Record<string, unknown> = { deletedAt: null, userId: { $in: [req.auth!.uid, "__catalog__"] } };
  if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const items = await recordModel("career").find(filter).sort({ title: 1 }).limit(50).lean();
  res.json({ success: true, data: items });
}));

careerRouter.get("/careers/matches", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const profile = await recordModel("profile").findOne({ userId: req.auth!.uid, deletedAt: null }).lean() as { data?: Record<string, unknown> } | null;
  const userSkills = z.array(SkillSchema).safeParse(profile?.data?.skills ?? []);
  const skills = userSkills.success ? userSkills.data : [];
  if (!skills.length) return res.json({ success: true, data: { matches: [], reason: "Add your skills to your profile to see which careers you are closest to." } });
  const items = await recordModel("career").find({ deletedAt: null, userId: { $in: [req.auth!.uid, "__catalog__"] } }).sort({ title: 1 }).limit(50).lean() as unknown as Array<{ _id: { toString(): string }; title: string; data?: Record<string, unknown> }>;
  const careers = items.flatMap((item) => {
    const requirements = z.array(CareerRequirementSchema).safeParse(item.data?.requiredSkills ?? []);
    if (!requirements.success) return [];
    const category = typeof item.data?.category === "string" ? item.data.category : undefined;
    return [{ id: item._id.toString(), title: item.title, ...(category ? { category } : {}), requirements: requirements.data }];
  });
  res.json({ success: true, data: { matches: rankCareerMatches(skills, careers), leverage: skillLeverage(skills, careers) } });
}));

careerRouter.post("/career/target", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const input = z.object({ careerId: objectId }).strict().parse(req.body);
  const career = await recordModel("career").findOne({ _id: input.careerId, deletedAt: null, userId: { $in: [req.auth!.uid, "__catalog__"] } });
  if (!career) return res.status(404).json({ success: false, error: { code: "CAREER_NOT_FOUND", message: "Choose a career from your accessible career catalog." } });
  const profile = await recordModel("profile").findOne({ userId: req.auth!.uid, deletedAt: null });
  const data = { ...(profile?.get("data") ?? {}), targetCareerId: career.id };
  const saved = profile ? await recordModel("profile").findOneAndUpdate({ _id: profile.id, userId: req.auth!.uid }, { $set: { title: "Career profile", data } }, { new: true }) : await recordModel("profile").create({ userId: req.auth!.uid, title: "Career profile", data });
  res.json({ success: true, data: { profile: saved?.toJSON(), career: career.toJSON() } });
}));

careerRouter.get("/skill-gap", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const careerId = typeof req.query.careerId === "string" ? req.query.careerId : undefined;
  if (careerId && !objectId.safeParse(careerId).success) return res.status(400).json({ success: false, error: { code: "INVALID_CAREER_ID", message: "The selected career ID is invalid." } });
  const result = await gapFor(req.auth!.uid, careerId);
  res.json({ success: true, data: { career: result.career, gap: result.gap, coverage: result.gap.length ? Math.round(result.gap.filter((item) => item.status === "MATCHED").length * 100 / result.gap.length) : 0, readiness: summarizeReadiness(result.gap) } });
}));

careerRouter.post("/roadmaps/generate", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const input = z.object({ careerId: objectId, hoursPerWeek: z.number().int().min(1).max(60).optional() }).strict().parse(req.body);
  const { career, gap } = await gapFor(req.auth!.uid, input.careerId);
  if (!career) return res.status(404).json({ success: false, error: { code: "CAREER_NOT_FOUND", message: "The selected career is not available." } });
  const existing = await recordModel("roadmap").findOne({ userId: req.auth!.uid, "data.careerId": input.careerId, deletedAt: null }).lean() as { data?: { hoursPerWeek?: number; tasks?: Array<{ id: string; status: string }> } } | null;
  const previousStatus = new Map((existing?.data?.tasks ?? []).map((task) => [task.id, task.status]));
  const hoursPerWeek = input.hoursPerWeek ?? existing?.data?.hoursPerWeek ?? 8;
  const planned = buildRoadmapPlan(career._id.toString(), gap);
  const tasks = planned.map((task) => ({ ...task, status: previousStatus.get(task.id) === "COMPLETED" || previousStatus.get(task.id) === "IN_PROGRESS" ? previousStatus.get(task.id) : "TODO" }));
  const remainingHours = tasks.filter((task) => task.status !== "COMPLETED").reduce((sum, task) => sum + task.estimateHours, 0);
  const data = {
    careerId: career._id.toString(), careerTitle: career.title, generatedAt: new Date().toISOString(), hoursPerWeek, tasks,
    readiness: summarizeReadiness(gap), projection: projectCompletion(remainingHours, hoursPerWeek),
    completionPercent: tasks.length ? Math.round(tasks.filter((task) => task.status === "COMPLETED").length * 100 / tasks.length) : 100,
  };
  const row = existing
    ? await recordModel("roadmap").findOneAndUpdate({ userId: req.auth!.uid, "data.careerId": input.careerId }, { $set: { title: `${career.title} roadmap`, data } }, { new: true })
    : await recordModel("roadmap").create({ userId: req.auth!.uid, title: `${career.title} roadmap`, data });
  res.json({ success: true, data: row?.toJSON() });
}));

careerRouter.patch("/roadmaps/:id/tasks/:taskId", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const params = z.object({ id: objectId, taskId: z.string().min(1).max(80) }).parse(req.params);
  const input = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]) }).strict().parse(req.body);
  const row = await recordModel("roadmap").findOne({ _id: params.id, userId: req.auth!.uid, deletedAt: null });
  if (!row) return res.status(404).json({ success: false, error: { code: "ROADMAP_NOT_FOUND", message: "The roadmap was not found." } });
  const data = row.get("data") as { tasks: Array<{ id: string; status: string }>; completionPercent?: number };
  const task = data.tasks.find((item) => item.id === params.taskId);
  if (!task) return res.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "The roadmap task was not found." } });
  task.status = input.status;
  data.completionPercent = data.tasks.length ? Math.round(data.tasks.filter((item) => item.status === "COMPLETED").length * 100 / data.tasks.length) : 100;
  row.set("data", data);
  await row.save();
  res.json({ success: true, data: row.toJSON() });
}));
