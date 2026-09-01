// Skill baselines: the generator starts from what was ACTUALLY performed most
// recently — not the variation it originally prescribed. Completion does not
// auto-promote; the demonstrated level is the baseline, smarter progression
// can layer on later.

import type { SkillVariation, WorkoutSession } from "../types";
import { getSkillVariation, SKILL_FAMILIES_BY_ID, SKILL_STARTING_LEVELS } from "../seed/skills";

/** most recently performed variation of a family (any completed set counts as performed) */
export function latestPerformedVariationId(
  sessions: WorkoutSession[],
  familyId: string,
): string | null {
  for (const session of sessions) {
    // newest first
    for (const section of session.snapshot.sections) {
      if (section.type !== "SKILL_PRACTICE" || section.familyId !== familyId) continue;
      const result = session.sections.find((r) => r.sectionId === section.id)?.skillPractice;
      if (!result) continue;
      const performed = result.sets.some((s) => s.completed) || result.completed;
      if (performed) return result.selectedVariationId;
    }
  }
  return null;
}

/** baseline variation: latest performed → athlete's configured start → level 1 */
export function baselineVariation(sessions: WorkoutSession[], familyId: string): SkillVariation {
  const family = SKILL_FAMILIES_BY_ID[familyId];
  if (!family) throw new Error(`Unknown skill family: ${familyId}`);
  const performedId = latestPerformedVariationId(sessions, familyId);
  const candidate =
    (performedId && getSkillVariation(familyId, performedId)) ||
    getSkillVariation(familyId, SKILL_STARTING_LEVELS[familyId] ?? "") ||
    family.variations[0];
  return candidate;
}

/** which candidate family was trained least recently (never-trained wins) */
export function leastRecentlyTrainedFamily(
  sessions: WorkoutSession[],
  candidates: string[],
): string {
  const lastTrained = new Map<string, string>(); // familyId → date
  for (const session of sessions) {
    for (const section of session.snapshot.sections) {
      if (section.type === "SKILL_PRACTICE" && candidates.includes(section.familyId)) {
        if (!lastTrained.has(section.familyId)) lastTrained.set(section.familyId, session.date);
      }
    }
  }
  const never = candidates.filter((c) => !lastTrained.has(c));
  if (never.length > 0) return never[0];
  return [...candidates].sort(
    (a, b) => (lastTrained.get(a)! < lastTrained.get(b)! ? -1 : 1),
  )[0];
}
