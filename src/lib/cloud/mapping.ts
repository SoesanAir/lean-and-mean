// Converters between the app's domain documents and Supabase rows.
// Results/notes live as structured JSON in workout_sessions.performance —
// the session document (spec §23) stays the atomic unit of truth.

import type { Database, Json } from "../database.types";
import type { DailyLog, DayTemplate, SectionResult, WorkoutSession } from "../types";

export type SessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["workout_sessions"]["Insert"];
export type DailyLogRow = Database["public"]["Tables"]["daily_logs"]["Row"];
export type DailyLogInsert = Database["public"]["Tables"]["daily_logs"]["Insert"];

interface SessionPerformance {
  sections: SectionResult[];
  workoutNote?: WorkoutSession["workoutNote"];
}

export function sessionToRow(s: WorkoutSession, updatedAt: string): SessionInsert {
  const performance: SessionPerformance = {
    sections: s.sections,
    workoutNote: s.workoutNote,
  };
  return {
    id: s.id,
    date: s.date,
    day: s.day,
    started_at: s.startedAt,
    finished_at: s.finishedAt ?? null,
    prescription_snapshot: s.snapshot as unknown as Json,
    performance: performance as unknown as Json,
    quote: s.quote,
    difficulty: s.feedback?.difficulty ?? null,
    energy: s.feedback?.energy ?? null,
    soreness_before: s.feedback?.sorenessBefore ?? null,
    soreness_after: s.feedback?.sorenessAfter ?? null,
    pain: s.feedback?.pain ?? null,
    pain_note: s.feedback?.painNote ?? null,
    updated_at: updatedAt,
  };
}

export function rowToSession(row: SessionRow): WorkoutSession {
  const performance = (row.performance ?? {}) as unknown as Partial<SessionPerformance>;
  const session: WorkoutSession = {
    id: row.id,
    date: row.date,
    day: row.day,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    snapshot: row.prescription_snapshot as unknown as DayTemplate,
    quote: row.quote ?? "",
    sections: performance.sections ?? [],
    workoutNote: performance.workoutNote,
  };
  if (row.difficulty) {
    session.feedback = {
      difficulty: row.difficulty as NonNullable<WorkoutSession["feedback"]>["difficulty"],
      energy: (row.energy ?? undefined) as NonNullable<WorkoutSession["feedback"]>["energy"],
      sorenessBefore: (row.soreness_before ?? undefined) as NonNullable<
        WorkoutSession["feedback"]
      >["sorenessBefore"],
      sorenessAfter: (row.soreness_after ?? undefined) as NonNullable<
        WorkoutSession["feedback"]
      >["sorenessAfter"],
      pain: row.pain ?? false,
      painNote: row.pain_note ?? undefined,
    };
  }
  return session;
}

export function dailyLogToRow(log: DailyLog, updatedAt: string): DailyLogInsert {
  return {
    date: log.date,
    weight_kg: log.weightKg ?? null,
    waist_cm: log.waistCm ?? null,
    steps: log.steps ?? null,
    sleep_hours: log.sleepHours ?? null,
    energy: log.energy ?? null,
    soreness: log.soreness ?? null,
    protein_g: log.proteinG ?? null,
    calories: log.calories ?? null,
    note: (log.note ?? null) as unknown as Json,
    updated_at: updatedAt,
  };
}

export function rowToDailyLog(row: DailyLogRow): DailyLog {
  return {
    date: row.date,
    weightKg: row.weight_kg ?? undefined,
    waistCm: row.waist_cm ?? undefined,
    steps: row.steps ?? undefined,
    sleepHours: row.sleep_hours ?? undefined,
    energy: (row.energy ?? undefined) as DailyLog["energy"],
    soreness: (row.soreness ?? undefined) as DailyLog["soreness"],
    proteinG: row.protein_g ?? undefined,
    calories: row.calories ?? undefined,
    note: (row.note as unknown as DailyLog["note"]) ?? undefined,
  };
}
