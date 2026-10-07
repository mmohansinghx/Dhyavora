import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { databaseStatus } from "../../config/database.js";
import { recordModel } from "../records/model.js";
import { getVirtualAssessment, isVirtualAssessmentId, listVirtualAssessments, virtualIndexFromId, VIRTUAL_ASSESSMENT_COUNT } from "./catalog.js";

export const assessmentRouter = Router();
const question = z.object({ prompt: z.string().trim().min(2).max(1500), options: z.array(z.string().trim().min(1).max(500)).min(2).max(8), correctOption: z.number().int().nonnegative(), points: z.number().min(0).max(20).default(1) }).refine((item) => item.correctOption < item.options.length, { message: "correctOption must refer to an available option" });
const assessmentInput = z.object({ title: z.string().trim().min(2).max(180), data: z.object({ description: z.string().max(2000).optional(), durationMinutes: z.number().int().min(1).max(240), negativeMark: z.number().min(0).max(20).default(0), questions: z.array(question).min(1).max(100), careerId: z.string().optional(), career: z.string().trim().max(120).optional(), company: z.string().trim().max(120).optional(), role: z.string().trim().max(120).optional(), difficulty: z.enum(["Easy", "Medium", "Hard", "Medium → Hard"]).optional(), topics: z.array(z.string().trim().min(1).max(80)).max(20).default([]), assessmentType: z.enum(["MCQ", "Coding", "Debugging", "SQL", "Output prediction", "System Design", "Behavioral/Scenario"]).optional(), active: z.boolean().default(true) }).strict() }).strict();

function unavailable(res: import("express").Response) {
  if (databaseStatus().connected) return false;
  res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  return true;
}
const assessmentIdSchema = z.string().refine((value) => /^[\da-f]{24}$/i.test(value) || isVirtualAssessmentId(value), { message: "Invalid assessment id" });

async function findAssessmentDefinition(id: string) {
  const virtualIndex = virtualIndexFromId(id);
  if (virtualIndex !== null && virtualIndex < VIRTUAL_ASSESSMENT_COUNT) return getVirtualAssessment(virtualIndex);
  if (isVirtualAssessmentId(id)) return null;
  return await recordModel("assessment").findOne({ _id: id, deletedAt: null, "data.active": true }).lean();
}

function withoutAnswers<T extends { data?: Record<string, unknown> }>(row: T) {
  const data = row.data ?? {};
  const questions = Array.isArray(data.questions) ? data.questions.map((q) => {
    if (!q || typeof q !== "object") return q;
    const { correctOption: _hidden, ...safe } = q as Record<string, unknown>;
    return safe;
  }) : [];
  return { ...row, data: { ...data, questions } };
}

assessmentRouter.get("/assessments", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const optionalQueryText = (max: number) => z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );
  const optionalDifficulty = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["Easy", "Medium", "Hard", "Medium → Hard"]).optional(),
  );
  const query = z.object({
    search: optionalQueryText(120),
    company: optionalQueryText(120),
    career: optionalQueryText(120),
    role: optionalQueryText(120),
    difficulty: optionalDifficulty,
    topic: optionalQueryText(80),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }).parse(req.query);

  const filter: Record<string, unknown> = { deletedAt: null, "data.active": true };
  const escape = (value: string) => value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  if (query.company) filter["data.company"] = new RegExp("^" + escape(query.company) + "$", "i");
  if (query.career) filter["data.career"] = new RegExp("^" + escape(query.career) + "$", "i");
  if (query.role) filter["data.role"] = new RegExp("^" + escape(query.role) + "$", "i");
  if (query.difficulty) filter["data.difficulty"] = query.difficulty;
  if (query.topic) filter["data.topics"] = query.topic;
  if (query.search) {
    const re = new RegExp(escape(query.search), "i");
    filter["$or"] = [{ title: re }, { "data.description": re }, { "data.company": re }, { "data.career": re }, { "data.role": re }, { "data.topics": re }];
  }

  const skip = (query.page - 1) * query.limit;
  const actualTotal = await recordModel("assessment").countDocuments(filter);
  const actualTake = skip < actualTotal ? Math.min(query.limit, actualTotal - skip) : 0;
  const actualRows = actualTake
    ? await recordModel("assessment").find(filter).sort({ updatedAt: -1 }).skip(skip).limit(actualTake).lean()
    : [];

  const virtualOffset = Math.max(0, skip - actualTotal);
  const virtualLimit = Math.max(0, query.limit - actualRows.length);
  const virtualPage = virtualLimit > 0
    ? listVirtualAssessments(query, virtualOffset, virtualLimit)
    : { rows: [], total: 0 };

  const total = actualTotal + virtualPage.total;
  const rows = [...actualRows, ...virtualPage.rows];
  res.json({
    success: true,
    data: rows.map((row) => withoutAnswers(row as never)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
      virtualTotal: VIRTUAL_ASSESSMENT_COUNT,
    },
  });
}));

assessmentRouter.post("/admin/assessments", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const input = assessmentInput.parse(req.body);
  const row = await recordModel("assessment").create({ userId: "__catalog__", title: input.title, data: input.data });
  res.status(201).json({ success: true, data: withoutAnswers(row.toJSON() as never) });
}));

assessmentRouter.post("/assessments/:id/attempts", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const { id } = z.object({ id: assessmentIdSchema }).parse(req.params);
  const assessment = await findAssessmentDefinition(id) as {
    _id: { toString(): string } | string;
    title: string;
    data: { durationMinutes: number; questions: Array<{ prompt: string; options: string[] }> };
  } | null;
  if (!assessment) return res.status(404).json({ success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "The assessment is unavailable." } });
  const startedAt = new Date();
  const assessmentId = typeof assessment._id === "string" ? assessment._id : assessment._id.toString();
  const attempt = await recordModel("assessment-attempt").create({ userId: req.auth!.uid, title: assessment.title, data: { assessmentId, startedAt: startedAt.toISOString(), durationMinutes: assessment.data.durationMinutes, answers: {}, status: "IN_PROGRESS" } });
  const questions = assessment.data.questions.map(({ prompt, options }, index) => ({ id: String(index), prompt, options }));
  res.status(201).json({ success: true, data: { attemptId: attempt.id, startedAt: startedAt.toISOString(), durationMinutes: assessment.data.durationMinutes, questions } });
}));

assessmentRouter.put("/assessment-attempts/:id/answers/:questionIndex", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const params = z.object({ id: assessmentIdSchema, questionIndex: z.coerce.number().int().nonnegative() }).parse(req.params);
  const input = z.object({ selectedOption: z.number().int().nonnegative().optional(), markForReview: z.boolean().default(false) }).strict().parse(req.body);
  const attempt = await recordModel("assessment-attempt").findOne({ _id: params.id, userId: req.auth!.uid, deletedAt: null });
  if (!attempt) return res.status(404).json({ success: false, error: { code: "ATTEMPT_NOT_FOUND", message: "The assessment attempt was not found." } });
  const data = attempt.get("data") as { assessmentId: string; startedAt: string; durationMinutes: number; answers: Record<string, { selectedOption?: number; markForReview: boolean }>; status: string };
  if (data.status !== "IN_PROGRESS") return res.status(409).json({ success: false, error: { code: "ATTEMPT_CLOSED", message: "This attempt has already been submitted." } });
  if (Date.now() > Date.parse(data.startedAt) + data.durationMinutes * 60000) return res.status(409).json({ success: false, error: { code: "TIME_EXPIRED", message: "The server controlled assessment timer has expired." } });
  const assessment = await findAssessmentDefinition(data.assessmentId) as { data: { questions: Array<{ options: string[] }> } } | null;
  const target = assessment?.data.questions[params.questionIndex];
  if (!target || (input.selectedOption !== undefined && input.selectedOption >= target.options.length)) return res.status(400).json({ success: false, error: { code: "INVALID_ANSWER", message: "The selected question or option is invalid." } });
  data.answers = data.answers ?? {};
  data.answers[String(params.questionIndex)] = input;
  attempt.set("data", data);
  attempt.markModified("data");
  await attempt.save();
  res.json({ success: true, data: { saved: true, answered: input.selectedOption !== undefined, markForReview: input.markForReview } });
}));

assessmentRouter.post("/assessment-attempts/:id/submit", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const { id } = z.object({ id: assessmentIdSchema }).parse(req.params);
  const attempt = await recordModel("assessment-attempt").findOne({ _id: id, userId: req.auth!.uid, deletedAt: null });
  if (!attempt) return res.status(404).json({ success: false, error: { code: "ATTEMPT_NOT_FOUND", message: "The assessment attempt was not found." } });
  const data = attempt.get("data") as { assessmentId: string; startedAt: string; durationMinutes: number; answers: Record<string, { selectedOption?: number; markForReview: boolean }>; status: string };
  if (data.status !== "IN_PROGRESS") return res.status(409).json({ success: false, error: { code: "ATTEMPT_CLOSED", message: "This attempt has already been submitted." } });
  const assessment = await findAssessmentDefinition(data.assessmentId) as { data: { negativeMark: number; questions: Array<{ correctOption: number; points: number }> } } | null;
  if (!assessment) return res.status(404).json({ success: false, error: { code: "ASSESSMENT_NOT_FOUND", message: "The assessment definition is unavailable." } });
  const savedAnswers = data.answers ?? {};
  const elapsedMs = Date.now() - Date.parse(data.startedAt);
  const timedOut = elapsedMs > data.durationMinutes * 60000;
  let correct = 0; let incorrect = 0; let skipped = 0;
  assessment.data.questions.forEach((item, index) => {
    const answer = savedAnswers[String(index)];
    if (answer?.selectedOption === undefined) skipped++;
    else if (answer.selectedOption === item.correctOption) correct++;
    else incorrect++;
  });
  // Negative marks are applied only after the server loads the private assessment definition.
  let score = 0;
  assessment.data.questions.forEach((item, index) => {
    const answer = savedAnswers[String(index)];
    if (answer?.selectedOption === item.correctOption) score += item.points;
    else if (answer?.selectedOption !== undefined) score -= assessment.data.negativeMark;
  });
  data.status = "SUBMITTED";
  attempt.set("data", { ...data, answers: savedAnswers, result: { correct, incorrect, skipped, score: Math.max(0, score), submittedAt: new Date().toISOString(), timedOut } });
  attempt.markModified("data");
  await attempt.save();
  res.json({ success: true, data: { correct, incorrect, skipped, score: Math.max(0, score), questionCount: assessment.data.questions.length, timedOut } });
}));

assessmentRouter.get("/assessment-attempts", requireAuth, asyncHandler(async (req, res) => {
  if (unavailable(res)) return;
  const rows = await recordModel("assessment-attempt").find({ userId: req.auth!.uid, deletedAt: null, "data.status": "SUBMITTED" }).sort({ updatedAt: -1 }).limit(50).lean();
  res.json({ success: true, data: rows });
}));
