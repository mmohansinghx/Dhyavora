import { z } from "zod";

export const SkillLevel = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]);
export const SkillGapStatus = z.enum(["MISSING", "DEVELOPING", "MATCHED"]);
export const SkillSchema = z.object({ name: z.string().trim().min(1).max(80), level: SkillLevel });
export const CareerRequirementSchema = z.object({ name: z.string().trim().min(1).max(80), requiredLevel: SkillLevel });
export const SkillGapItemSchema = CareerRequirementSchema.extend({ currentLevel: SkillLevel.optional(), status: SkillGapStatus });
export const ApiSuccessSchema = z.object({ success: z.literal(true), data: z.unknown() });
export const ApiErrorSchema = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }) });

export type Skill = z.infer<typeof SkillSchema>;
export type CareerRequirement = z.infer<typeof CareerRequirementSchema>;
export type SkillGapItem = z.infer<typeof SkillGapItemSchema>;

const LEVEL_SCORE: Record<z.infer<typeof SkillLevel>, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

/** Canonical deterministic skill-gap calculation shared by API and UI. */
export function computeSkillGap(userSkills: Skill[], careerRequirements: CareerRequirement[]): SkillGapItem[] {
  const byName = new Map(userSkills.map((skill) => [skill.name.trim().toLocaleLowerCase(), skill]));
  return careerRequirements.map((requirement) => {
    const current = byName.get(requirement.name.trim().toLocaleLowerCase());
    const status = !current ? "MISSING" : LEVEL_SCORE[current.level] < LEVEL_SCORE[requirement.requiredLevel] ? "DEVELOPING" : "MATCHED";
    return { ...requirement, ...(current ? { currentLevel: current.level } : {}), status };
  });
}

export function stableTaskId(careerId: string, skillName: string, index: number): string {
  const normalized = `${careerId}:${skillName.trim().toLocaleLowerCase()}:${index}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) hash = Math.imul(hash ^ normalized.charCodeAt(i), 16777619);
  return `task_${(hash >>> 0).toString(36)}`;
}

/* ------------------------------------------------------------------ */
/* Career intelligence: readiness, career matching and phased roadmaps */
/* ------------------------------------------------------------------ */

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
/** Rough guidance for one level step. Shown as an estimate, never as a promise. */
const HOURS_PER_LEVEL_STEP = 24;

export type ReadinessSummary = {
  /** 0-100. Partial credit for developing skills, so progress is visible before a skill is fully matched. */
  readiness: number;
  matched: number;
  developing: number;
  missing: number;
  total: number;
  /** Total level steps still to climb across all requirements. */
  stepsRemaining: number;
  /** Estimated study hours to close the full gap. */
  hoursRemaining: number;
};

function levelIndex(level?: z.infer<typeof SkillLevel>): number {
  return level ? LEVEL_SCORE[level] : 0;
}

/** Steps between a person's current level (0 = none) and the level a career requires. */
export function levelStepsRemaining(item: SkillGapItem): number {
  return Math.max(0, LEVEL_SCORE[item.requiredLevel] - levelIndex(item.currentLevel));
}

export function summarizeReadiness(gap: SkillGapItem[]): ReadinessSummary {
  const total = gap.length;
  if (!total) return { readiness: 0, matched: 0, developing: 0, missing: 0, total: 0, stepsRemaining: 0, hoursRemaining: 0 };
  let earned = 0;
  let possible = 0;
  let stepsRemaining = 0;
  for (const item of gap) {
    const required = LEVEL_SCORE[item.requiredLevel];
    possible += required;
    earned += Math.min(required, levelIndex(item.currentLevel));
    stepsRemaining += levelStepsRemaining(item);
  }
  return {
    readiness: Math.round((earned * 100) / possible),
    matched: gap.filter((item) => item.status === "MATCHED").length,
    developing: gap.filter((item) => item.status === "DEVELOPING").length,
    missing: gap.filter((item) => item.status === "MISSING").length,
    total,
    stepsRemaining,
    hoursRemaining: stepsRemaining * HOURS_PER_LEVEL_STEP,
  };
}

export type CareerMatch = ReadinessSummary & { careerId: string; title: string; category?: string; topGaps: string[] };

/** Rank careers by how close the person already is. Careers without a skill map are left out rather than guessed. */
export function rankCareerMatches(
  userSkills: Skill[],
  careers: Array<{ id: string; title: string; category?: string; requirements: CareerRequirement[] }>,
): CareerMatch[] {
  return careers
    .filter((career) => career.requirements.length > 0)
    .map((career) => {
      const gap = computeSkillGap(userSkills, career.requirements);
      const summary = summarizeReadiness(gap);
      const topGaps = gap
        .filter((item) => item.status !== "MATCHED")
        .sort((a, b) => levelStepsRemaining(b) - levelStepsRemaining(a))
        .slice(0, 3)
        .map((item) => item.name);
      return { ...summary, careerId: career.id, title: career.title, ...(career.category ? { category: career.category } : {}), topGaps };
    })
    .sort((a, b) => b.readiness - a.readiness || a.hoursRemaining - b.hoursRemaining || a.title.localeCompare(b.title));
}

export type RoadmapPhase = "FOUNDATION" | "BUILD" | "PROVE";
export type RoadmapTaskKind = "LEARN" | "PRACTISE" | "PROVE";
export type PlannedTask = {
  id: string;
  title: string;
  description: string;
  skill: string;
  kind: RoadmapTaskKind;
  phase: RoadmapPhase;
  order: number;
  estimateHours: number;
  targetLevel: z.infer<typeof SkillLevel>;
};

const PHASE_FOR_KIND: Record<RoadmapTaskKind, RoadmapPhase> = { LEARN: "FOUNDATION", PRACTISE: "BUILD", PROVE: "PROVE" };

/**
 * Turn a skill gap into a phased plan. Each open skill becomes up to three steps:
 * learn it, practise it, then prove it with evidence. Learn keeps task index 0 so
 * tasks completed in older roadmaps keep their completed status after a refresh.
 */
export function buildRoadmapPlan(careerId: string, gap: SkillGapItem[]): PlannedTask[] {
  const open = gap
    .filter((item) => item.status !== "MATCHED")
    .sort((a, b) => (a.status === b.status ? levelStepsRemaining(b) - levelStepsRemaining(a) : a.status === "MISSING" ? -1 : 1));
  const tasks: Omit<PlannedTask, "order">[] = [];
  for (const item of open) {
    const steps = Math.max(1, levelStepsRemaining(item));
    const from = item.currentLevel ? item.currentLevel.toLowerCase() : "no recorded level";
    const to = item.requiredLevel.toLowerCase();
    tasks.push({
      id: stableTaskId(careerId, item.name, 0),
      title: `Build ${item.name} competency`,
      description: `Study the core ideas of ${item.name} to move from ${from} to ${to}. This is a recommendation based on your current skill gap.`,
      skill: item.name, kind: "LEARN", phase: PHASE_FOR_KIND.LEARN, estimateHours: Math.max(4, Math.round(steps * HOURS_PER_LEVEL_STEP * 0.5)), targetLevel: item.requiredLevel,
    });
    tasks.push({
      id: stableTaskId(careerId, item.name, 1),
      title: `Practise ${item.name} on real problems`,
      description: `Apply ${item.name} to exercises or a small build until you can do it without following a tutorial.`,
      skill: item.name, kind: "PRACTISE", phase: PHASE_FOR_KIND.PRACTISE, estimateHours: Math.max(3, Math.round(steps * HOURS_PER_LEVEL_STEP * 0.35)), targetLevel: item.requiredLevel,
    });
    tasks.push({
      id: stableTaskId(careerId, item.name, 2),
      title: `Prove ${item.name} with evidence`,
      description: `Add a project, assessment result or write-up that shows your ${item.name} skill, then update your profile level.`,
      skill: item.name, kind: "PROVE", phase: PHASE_FOR_KIND.PROVE, estimateHours: Math.max(2, Math.round(steps * HOURS_PER_LEVEL_STEP * 0.15)), targetLevel: item.requiredLevel,
    });
  }
  const phaseRank: Record<RoadmapPhase, number> = { FOUNDATION: 0, BUILD: 1, PROVE: 2 };
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => phaseRank[a.task.phase] - phaseRank[b.task.phase] || a.index - b.index)
    .map(({ task }, index) => ({ ...task, order: index + 1 }));
}

/** Projected finish for the remaining hours at a weekly pace. Returns null when there is nothing left or no pace. */
export function projectCompletion(remainingHours: number, hoursPerWeek: number, from: Date = new Date()): { weeks: number; date: string } | null {
  if (remainingHours <= 0 || hoursPerWeek <= 0) return null;
  const weeks = Math.ceil(remainingHours / hoursPerWeek);
  const date = new Date(from.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return { weeks, date: date.toISOString().slice(0, 10) };
}

export type SkillLeverage = { name: string; careerCount: number; careerTitles: string[]; stepsRemaining: number };

/**
 * Skills the person has not yet matched that appear in the most careers.
 * Learning one of these moves readiness for several careers at once.
 */
export function skillLeverage(
  userSkills: Skill[],
  careers: Array<{ title: string; requirements: CareerRequirement[] }>,
  limit = 5,
): SkillLeverage[] {
  const byName = new Map<string, SkillLeverage>();
  for (const career of careers) {
    for (const item of computeSkillGap(userSkills, career.requirements)) {
      if (item.status === "MATCHED") continue;
      const key = item.name.trim().toLocaleLowerCase();
      const entry = byName.get(key) ?? { name: item.name, careerCount: 0, careerTitles: [], stepsRemaining: 0 };
      entry.careerCount += 1;
      entry.stepsRemaining += levelStepsRemaining(item);
      if (entry.careerTitles.length < 3) entry.careerTitles.push(career.title);
      byName.set(key, entry);
    }
  }
  return [...byName.values()]
    .filter((entry) => entry.careerCount > 1)
    .sort((a, b) => b.careerCount - a.careerCount || b.stepsRemaining - a.stepsRemaining || a.name.localeCompare(b.name))
    .slice(0, limit);
}
