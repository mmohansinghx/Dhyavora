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
