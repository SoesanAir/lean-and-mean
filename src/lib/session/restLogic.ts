// Pure rest-timer decision logic (unit-tested; UI just calls this).

import type { SetResult, SetsPrescription, WorkoutSection } from "../types";

/**
 * Only straight sets get automatic rest. In circuits the next chronological
 * work is a DIFFERENT exercise (equipment change — intentionally untimed),
 * and timed blocks/intervals manage their own clocks.
 */
export function sectionAllowsRest(type: WorkoutSection["type"]): boolean {
  return type === "STRAIGHT_SETS";
}

export interface RestPlan {
  seconds: number;
  nextSetIndex: number; // 0-based
}

/**
 * Decide whether completing set `completedIndex` should start a rest timer.
 * Returns null when: no restSeconds prescribed, the section type doesn't use
 * set rest, or no further uncompleted set of the SAME exercise remains
 * (no rest after the final set — equipment changes between exercises are
 * intentionally untimed).
 */
export function planRestAfterSet(
  sectionType: WorkoutSection["type"],
  prescription: SetsPrescription,
  sets: SetResult[],
  completedIndex: number,
): RestPlan | null {
  if (!sectionAllowsRest(sectionType)) return null;
  if (!prescription.restSeconds || prescription.restSeconds <= 0) return null;

  const remaining = sets.filter(
    (s) => s.setIndex !== completedIndex && !s.completed && !s.skipped,
  );
  if (remaining.length === 0) return null;

  // prefer the next set after the one just finished, else the earliest open one
  const after = remaining.filter((s) => s.setIndex > completedIndex);
  const next = (after.length > 0 ? after : remaining).sort((a, b) => a.setIndex - b.setIndex)[0];
  return { seconds: prescription.restSeconds, nextSetIndex: next.setIndex };
}
