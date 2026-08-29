"use client";

import { useEffect, useReducer } from "react";
import type { TimerState } from "../types";

/**
 * Timers are derived from persisted TimerState ({status, startedAt epoch,
 * elapsedBeforePauseMs}) so they survive reload/navigation (spec §26).
 */
export function elapsedMs(t: TimerState, now = Date.now()): number {
  const running = t.status === "running" && t.startedAt !== undefined ? now - t.startedAt : 0;
  return t.elapsedBeforePauseMs + Math.max(0, running);
}

export function elapsedSec(t: TimerState, now = Date.now()): number {
  return Math.floor(elapsedMs(t, now) / 1000);
}

export const timerStart = (t: TimerState): Partial<TimerState> =>
  t.status === "running" ? {} : { status: "running", startedAt: Date.now() };

export const timerPause = (t: TimerState): Partial<TimerState> =>
  t.status !== "running"
    ? {}
    : { status: "paused", startedAt: undefined, elapsedBeforePauseMs: elapsedMs(t) };

export const timerFinish = (t: TimerState): Partial<TimerState> => ({
  status: "finished",
  startedAt: undefined,
  elapsedBeforePauseMs: elapsedMs(t),
});

export const timerReset = (): Partial<TimerState> => ({
  status: "idle",
  startedAt: undefined,
  elapsedBeforePauseMs: 0,
});

/** re-render once a second while `active` */
export function useTicker(active: boolean): void {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active]);
}
