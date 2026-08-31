"use client";

import type {
  CycleResult,
  DailyLog,
  Note,
  SetResult,
  SkillResult,
  TimedBlockResult,
  TimerState,
  WorkoutFeedback,
  WorkoutSession,
} from "../types";
import { getDayTemplate } from "../seed/week1";
import { buildSession } from "./snapshot";
import { nowISO, todayISO, uid } from "../util";

// ---------------------------------------------------------------------------
// Local-first persistent store. Every mutation writes localStorage
// synchronously (the most aggressive autosave possible), so closing or
// reloading the app never loses state (spec §5/§7/§31).
// ---------------------------------------------------------------------------

export interface AppState {
  version: 1;
  activeSession: WorkoutSession | null;
  completedSessions: WorkoutSession[];
  dailyLogs: Record<string, DailyLog>; // keyed by date
  /** per-day editable quote overrides (spec §8) */
  quoteOverrides: Record<number, string>;
}

const STORAGE_KEY = "lean-and-mean/v1";

const emptyState = (): AppState => ({
  version: 1,
  activeSession: null,
  completedSessions: [],
  dailyLogs: {},
  quoteOverrides: {},
});

function load(): AppState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.version !== 1) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

let state: AppState | null = null;
const listeners = new Set<() => void>();

function getStateInternal(): AppState {
  if (state === null) state = load();
  return state;
}

function persist(next: AppState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full/unavailable — keep in-memory state so the session continues
    }
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return getStateInternal();
}

/** stable server snapshot to keep SSR happy */
const SERVER_STATE = emptyState();
export function getServerState(): AppState {
  return SERVER_STATE;
}

function update(mutator: (draft: AppState) => void) {
  // deep-clone-on-write keeps React reference semantics simple and guarantees
  // the persisted document always matches the rendered one
  const draft: AppState = JSON.parse(JSON.stringify(getStateInternal()));
  mutator(draft);
  persist(draft);
}

// ---------------- note helpers ----------------

export function makeOrUpdateNote(existing: Note | undefined, text: string): Note {
  if (existing) return { ...existing, text, updatedAt: nowISO() };
  const now = nowISO();
  return { id: uid(), text, createdAt: now, updatedAt: now };
}

// ---------------- workout lifecycle ----------------

export function startWorkout(day: number): void {
  update((d) => {
    if (d.activeSession) return; // resume existing — never silently overwrite
    const template = { ...getDayTemplate(day) };
    const quoteOverride = d.quoteOverrides[day];
    const session = buildSession(template, todayISO());
    if (quoteOverride) session.quote = quoteOverride;
    d.activeSession = session;
  });
}

export function discardActiveWorkout(): void {
  update((d) => {
    d.activeSession = null;
  });
}

export function finishWorkout(feedback: WorkoutFeedback, workoutNoteText?: string): void {
  update((d) => {
    const s = d.activeSession;
    if (!s) return;
    s.feedback = feedback;
    if (workoutNoteText?.trim()) {
      s.workoutNote = makeOrUpdateNote(s.workoutNote, workoutNoteText.trim());
    }
    s.finishedAt = nowISO();
    d.completedSessions.unshift(s);
    d.activeSession = null;
  });
}

export function setSessionQuote(quote: string): void {
  update((d) => {
    if (!d.activeSession) return;
    d.activeSession.quote = quote;
    d.quoteOverrides[d.activeSession.day] = quote;
  });
}

export function setDayQuote(day: number, quote: string): void {
  update((d) => {
    d.quoteOverrides[day] = quote;
  });
}

// ---------------- result mutations (all autosaved) ----------------

function withSection(
  d: AppState,
  sectionId: string,
  fn: (r: NonNullable<WorkoutSession["sections"]>[number]) => void,
) {
  const s = d.activeSession;
  if (!s) return;
  const r = s.sections.find((x) => x.sectionId === sectionId);
  if (r) fn(r);
}

export function updateSetResult(
  sectionId: string,
  prescriptionId: string,
  setIndex: number,
  patch: Partial<SetResult>,
): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const ex = r.exercises?.find((e) => e.prescriptionId === prescriptionId);
      const set = ex?.sets[setIndex];
      if (set) Object.assign(set, patch);
    }),
  );
}

export function setSetNote(
  sectionId: string,
  prescriptionId: string,
  setIndex: number,
  text: string,
): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const ex = r.exercises?.find((e) => e.prescriptionId === prescriptionId);
      const set = ex?.sets[setIndex];
      if (set) set.note = makeOrUpdateNote(set.note, text);
    }),
  );
}

export function setExerciseNote(sectionId: string, prescriptionId: string, text: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const ex = r.exercises?.find((e) => e.prescriptionId === prescriptionId);
      if (ex) ex.note = makeOrUpdateNote(ex.note, text);
    }),
  );
}

export function setSectionNote(sectionId: string, text: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      r.note = makeOrUpdateNote(r.note, text);
    }),
  );
}

export function setWorkoutNote(text: string): void {
  update((d) => {
    if (!d.activeSession) return;
    d.activeSession.workoutNote = makeOrUpdateNote(d.activeSession.workoutNote, text);
  });
}

export function updateTimedBlock(sectionId: string, patch: Partial<TimedBlockResult>): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      if (r.timedBlock) Object.assign(r.timedBlock, patch);
    }),
  );
}

export function setTimedBlockNote(sectionId: string, text: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      if (r.timedBlock) r.timedBlock.note = makeOrUpdateNote(r.timedBlock.note, text);
    }),
  );
}

export function updateCycle(sectionId: string, index: number, patch: Partial<CycleResult>): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const c = r.timedBlock?.cycles.find((x) => x.index === index);
      if (c) Object.assign(c, patch);
    }),
  );
}

export function setCycleNote(sectionId: string, index: number, text: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const c = r.timedBlock?.cycles.find((x) => x.index === index);
      if (c) c.note = makeOrUpdateNote(c.note, text);
    }),
  );
}

export function completeAllCycles(sectionId: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      if (!r.timedBlock) return;
      r.timedBlock.cycles.forEach((c) => (c.completed = true));
      r.timedBlock.completed = true;
      r.timedBlock.completedMinutes = r.timedBlock.cycles.length;
    }),
  );
}

export function updateSkill(sectionId: string, patch: Partial<SkillResult>): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      if (r.skill) Object.assign(r.skill, patch);
    }),
  );
}

export function setSkillNote(sectionId: string, text: string): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      if (r.skill) r.skill.note = makeOrUpdateNote(r.skill.note, text);
    }),
  );
}

export function updateTimer(
  sectionId: string,
  kind: "timedBlock" | "skill",
  patch: Partial<TimerState>,
): void {
  update((d) =>
    withSection(d, sectionId, (r) => {
      const holder = kind === "timedBlock" ? r.timedBlock : r.skill;
      if (holder) Object.assign(holder.timer, patch);
    }),
  );
}

// ---------------- daily log ----------------

export function upsertDailyLog(date: string, patch: Partial<DailyLog>): void {
  update((d) => {
    const existing = d.dailyLogs[date] ?? { date };
    d.dailyLogs[date] = { ...existing, ...patch, date };
  });
}

export function setDailyNote(date: string, text: string): void {
  update((d) => {
    const existing = d.dailyLogs[date] ?? { date };
    existing.note = makeOrUpdateNote(existing.note, text);
    d.dailyLogs[date] = existing;
  });
}

// ---------------- deletion (explicit, double-confirmed in the UI) ----------------

/** Permanently delete a completed workout (local now; sync propagates to cloud). */
export function deleteCompletedSession(id: string): void {
  update((d) => {
    d.completedSessions = d.completedSessions.filter((s) => s.id !== id);
  });
}

/** Permanently delete one day's daily log (local now; sync propagates to cloud). */
export function deleteDailyLog(date: string): void {
  update((d) => {
    delete d.dailyLogs[date];
  });
}

// ---------------- cloud sync support ----------------

/**
 * Atomically replace the whole local state (used by the cloud sync engine
 * when merging pulled data). Persists to localStorage like any mutation.
 */
export function replaceState(next: AppState): void {
  persist(next);
}

// ---------------- test/support ----------------

/** test-only: reset in-memory cache so load() re-reads storage */
export function __resetStoreForTests(): void {
  state = null;
  listeners.clear();
}
