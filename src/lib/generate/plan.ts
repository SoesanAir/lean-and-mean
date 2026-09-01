// Session-plan generation: the day template is enriched at workout start
// (then snapshotted — history stays immutable). Structure:
//   FREE MOVEMENT WARM-UP → SKILL PRACTICE → strength/conditioning
// Skills are an addition, not a takeover: handstand days keep their existing
// skill slot (converted to the progression system at the athlete's baseline);
// other training days get ONE short rotating skill block.

import type { DayTemplate, SkillPracticeSection, WorkoutSection, WorkoutSession } from "../types";
import { SKILL_FAMILIES_BY_ID } from "../seed/skills";
import { baselineVariation, leastRecentlyTrainedFamily } from "./baseline";
import { buildWarmupSection, recentWarmupMovementIds } from "./warmup";

/** rotating non-handstand families for the short skill block */
const ROTATION_FAMILIES = ["l-sit", "pistol-squat", "crow-to-tuck-planche"] as const;

function skillPracticeSection(
  id: string,
  familyId: string,
  sessions: WorkoutSession[],
  targetMinutes: number,
  intro?: string,
): SkillPracticeSection {
  const variation = baselineVariation(sessions, familyId);
  return {
    id,
    type: "SKILL_PRACTICE",
    title: SKILL_FAMILIES_BY_ID[familyId]?.name.toUpperCase() ?? familyId.toUpperCase(),
    emphasis: "SKILL",
    intro,
    familyId,
    variationId: variation.id,
    prescription: variation.defaultPrescription,
    targetMinutes,
  };
}

export function generateSessionPlan(
  template: DayTemplate,
  completedSessions: WorkoutSession[],
  rand: () => number = Math.random,
): DayTemplate {
  const plan: DayTemplate = JSON.parse(JSON.stringify(template));
  if (plan.isRest) return plan;

  // 1. convert legacy free handstand practice into the progression system,
  //    keeping the template's intended duration (no added time)
  plan.sections = plan.sections.map((s): WorkoutSection => {
    if (s.type === "SKILL" && s.exerciseId === "handstand") {
      return skillPracticeSection(
        s.id,
        "handstand-control",
        completedSessions,
        s.durationMin,
        s.intro ?? "Quality over quantity. Stop before technique deteriorates.",
      );
    }
    return s;
  });

  // 2. days without a handstand slot get ONE short rotating skill block
  const hasSkill = plan.sections.some((s) => s.type === "SKILL_PRACTICE");
  if (!hasSkill) {
    const available = ROTATION_FAMILIES.filter((f) => SKILL_FAMILIES_BY_ID[f]?.isAvailable);
    if (available.length > 0) {
      const familyId = leastRecentlyTrainedFamily(completedSessions, [...available]);
      plan.sections = [
        skillPracticeSection(
          `sk-d${plan.day}`,
          familyId,
          completedSessions,
          6,
          "Skill work while fresh: clean attempts, full rest, no grinding.",
        ),
        ...plan.sections,
      ];
    }
  }

  // 3. warm-up always comes first
  const warmup = buildWarmupSection(plan, recentWarmupMovementIds(completedSessions), rand);
  plan.sections = [warmup, ...plan.sections];

  return plan;
}
