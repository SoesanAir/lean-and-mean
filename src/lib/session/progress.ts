import type { SectionResult, WorkoutSession } from "../types";

export interface ProgressInfo {
  done: number;
  total: number;
  percent: number; // 0..100 integer
}

function sectionUnits(r: SectionResult): { done: number; total: number } {
  if (r.skill) return { done: r.skill.completed ? 1 : 0, total: 1 };
  if (r.timedBlock) {
    if (r.timedBlock.cycles.length > 0) {
      return {
        done: r.timedBlock.cycles.filter((c) => c.completed).length,
        total: r.timedBlock.cycles.length,
      };
    }
    return { done: r.timedBlock.completed ? 1 : 0, total: 1 };
  }
  if (r.exercises) {
    const sets = r.exercises.flatMap((e) => e.sets);
    return {
      done: sets.filter((s) => s.completed || s.skipped).length,
      total: sets.length,
    };
  }
  return { done: 0, total: 0 };
}

export function sessionProgress(session: WorkoutSession): ProgressInfo {
  let done = 0;
  let total = 0;
  for (const r of session.sections) {
    const u = sectionUnits(r);
    done += u.done;
    total += u.total;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function sectionProgress(r: SectionResult): ProgressInfo {
  const { done, total } = sectionUnits(r);
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
