import type { SectionResult, WorkoutSession } from "../types.ts";

export interface ProgressInfo {
  done: number;
  total: number;
  percent: number; // 0..100 integer
}

function sectionUnits(r: SectionResult): { done: number; total: number } {
  if (r.skill) return { done: r.skill.completed ? 1 : 0, total: 1 };
  if (r.warmup) return { done: r.warmup.completed ? 1 : 0, total: 1 };
  if (r.skillPractice) {
    return {
      done: r.skillPractice.sets.filter((s) => s.completed || s.skipped).length,
      total: r.skillPractice.sets.length,
    };
  }
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

/**
 * Which program day the Today screen should open on: the first day (1–7)
 * without a completed session. When days 1–6 are all done it lands on 7
 * (rest); once the whole cycle is exhausted it continues after the most
 * recently completed day.
 */
export function nextProgramDay(completedSessions: WorkoutSession[]): number {
  const done = new Set(completedSessions.map((s) => s.day));
  for (let d = 1; d <= 7; d++) {
    if (!done.has(d)) return d;
  }
  const latest = completedSessions[0]; // newest first
  return latest ? (latest.day % 7) + 1 : 1;
}
