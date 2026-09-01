"use client";

// Between-set rest timer. Deliberately tiny:
// - ONE timer at a time (starting a new one replaces the old — no duplicates)
// - absolute endsAt epoch, remaining is computed, so backgrounding/throttling
//   never drifts and the timer survives refresh (persisted to localStorage)
// - not part of the synced session document (ephemeral device state)

import { useSyncExternalStore } from "react";

export interface RestTimer {
  /** epoch ms when rest ends */
  endsAt: number;
  /** "Set 3 — Goblet Squat" */
  nextLabel: string;
  /** identity of the completed set that started this rest */
  key: string;
  totalSeconds: number;
}

const STORAGE_KEY = "lean-and-mean/rest-timer";

let timer: RestTimer | null | undefined; // undefined = not loaded yet
const listeners = new Set<() => void>();

function load(): RestTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as RestTimer;
    // drop timers that expired long ago (e.g. app reopened next day)
    if (typeof t.endsAt !== "number" || t.endsAt < Date.now() - 60_000) return null;
    return t;
  } catch {
    return null;
  }
}

function persist(next: RestTimer | null) {
  timer = next;
  if (typeof window !== "undefined") {
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function getRestTimer(): RestTimer | null {
  if (timer === undefined) timer = load();
  return timer;
}

export function startRest(key: string, nextLabel: string, seconds: number): void {
  persist({ key, nextLabel, totalSeconds: seconds, endsAt: Date.now() + seconds * 1000 });
}

/** +/− adjust; never below 5 seconds remaining */
export function adjustRest(deltaSeconds: number): void {
  const t = getRestTimer();
  if (!t) return;
  const remaining = Math.max(0, t.endsAt - Date.now());
  const next = Math.max(5_000, remaining + deltaSeconds * 1000);
  persist({ ...t, endsAt: Date.now() + next });
}

export function skipRest(): void {
  persist(null);
}

export function restRemainingSec(t: RestTimer, now = Date.now()): number {
  return Math.max(0, Math.ceil((t.endsAt - now) / 1000));
}

export function useRestTimer(): RestTimer | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getRestTimer,
    () => null,
  );
}
