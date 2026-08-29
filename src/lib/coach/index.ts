// AI coach service layer (spec §28). Pure functions over app data — kept
// separate from HTTP routing so the same services can later back
// /api/coach/* routes and an MCP server. No LLM in V1.

import type { AppState } from "../session/store";
import type { DailyLog, WorkoutSession } from "../types";
import { sessionProgress } from "../session/progress";

export interface CoachDaySummary {
  date: string;
  prescribed: WorkoutSession["snapshot"] | null;
  session: WorkoutSession | null;
  completionPercent: number | null;
  dailyLog: DailyLog | null;
}

export function coachToday(state: AppState, date: string): CoachDaySummary {
  return coachDay(state, date);
}

export function coachDay(state: AppState, date: string): CoachDaySummary {
  const session =
    state.activeSession?.date === date
      ? state.activeSession
      : (state.completedSessions.find((s) => s.date === date) ?? null);
  return {
    date,
    prescribed: session?.snapshot ?? null,
    session,
    completionPercent: session ? sessionProgress(session).percent : null,
    dailyLog: state.dailyLogs[date] ?? null,
  };
}

export function coachRecentSessions(state: AppState, limit = 14): WorkoutSession[] {
  return state.completedSessions.slice(0, limit);
}

export interface ExerciseHistoryEntry {
  date: string;
  day: number;
  weightKg?: number;
  blockWeightKg?: number | null;
  sets: Array<{ completed: boolean; actualReps?: number; noteText?: string }>;
}

/** Working-weight + performance history for one exercise (spec §21). */
export function coachExerciseHistory(state: AppState, exerciseId: string): ExerciseHistoryEntry[] {
  const entries: ExerciseHistoryEntry[] = [];
  for (const session of state.completedSessions) {
    for (const section of session.snapshot.sections) {
      const prescriptions =
        section.type === "STRAIGHT_SETS" || section.type === "CIRCUIT" ? section.prescriptions : [];
      for (const p of prescriptions) {
        if (p.exerciseId !== exerciseId) continue;
        const result = session.sections
          .find((r) => r.sectionId === section.id)
          ?.exercises?.find((e) => e.prescriptionId === p.id);
        entries.push({
          date: session.date,
          day: session.day,
          weightKg: p.weightKg,
          sets:
            result?.sets.map((s) => ({
              completed: s.completed,
              actualReps: s.actualReps,
              noteText: s.note?.text,
            })) ?? [],
        });
      }
    }
  }
  return entries;
}

export interface RecentNote {
  date: string;
  context: string;
  text: string;
  updatedAt: string;
}

export function coachRecentNotes(state: AppState, limit = 50): RecentNote[] {
  const notes: RecentNote[] = [];
  const pushNote = (date: string, context: string, note?: { text: string; updatedAt: string }) => {
    if (note?.text?.trim()) notes.push({ date, context, text: note.text, updatedAt: note.updatedAt });
  };
  for (const s of state.completedSessions) {
    pushNote(s.date, `Workout — Day ${s.day}`, s.workoutNote);
    for (const r of s.sections) {
      const title = s.snapshot.sections.find((x) => x.id === r.sectionId)?.title ?? r.sectionId;
      pushNote(s.date, `Section ${title}`, r.note);
      pushNote(s.date, `Block ${title}`, r.timedBlock?.note);
      pushNote(s.date, `Skill ${title}`, r.skill?.note);
      r.timedBlock?.cycles.forEach((c) => pushNote(s.date, `${title} ${c.label}`, c.note));
      r.exercises?.forEach((e) => {
        pushNote(s.date, `${title} — ${e.prescriptionId}`, e.note);
        e.sets.forEach((set) => pushNote(s.date, `${title} — set ${set.setIndex + 1}`, set.note));
      });
    }
  }
  for (const log of Object.values(state.dailyLogs)) {
    pushNote(log.date, "Daily log", log.note);
  }
  return notes
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}
