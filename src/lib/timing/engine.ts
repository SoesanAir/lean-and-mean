// ONE timing engine for every timed workout structure.
//
// A TimerPlan is a fully unrolled, machine-readable list of phases derived
// from the SAME section data the cards render (no timing lives only in
// prose). The engine is pure: current phase, remaining time and crossed cue
// boundaries are all DERIVED from wall-clock elapsed time (+ a persisted skew
// for Skip/±15s), never from a decrementing counter — so backgrounding for 70
// seconds across "30 A / 30 B / 30 rest" correctly lands 10 s into REST.

import type { TimerState } from "../types";
import { elapsedMs } from "../session/timer";

export type PhaseKind = "COUNTDOWN" | "WORK" | "REST" | "HOLD";

export interface TimerPhase {
  id: string;
  kind: PhaseKind;
  /** what the athlete should be DOING: "KB Swings", "REST", "Tuck L-sit hold" */
  label: string;
  /** reps/weight/grip context line */
  detail?: string;
  /** 0 = open-ended stopwatch phase (For Time without cap; must be last) */
  durationSec: number;
  round?: number;
  totalRounds?: number;
  /** "Minute" | "Round" — context word for round display */
  roundWord?: string;
  exerciseId?: string;
  /** soft phases (warm-up) get a light tick instead of 3-2-1 + alarm */
  soft?: boolean;
  /** play a warning cue this many seconds before the phase ends (AMRAP 10s) */
  warnAtSec?: number;
}

export type PlanMode = "EMOM" | "AMRAP" | "INTERVAL" | "WARMUP" | "HOLDS" | "FORTIME";

export interface TimerPlan {
  id: string; // section id
  mode: PlanMode;
  phases: TimerPhase[];
  endLabel: string; // "DONE"
}

export const PRESTART_SEC = 3;

/** pre-start 3-2-1 that does NOT consume workout time */
export function countdownPhase(soft = false): TimerPhase {
  return { id: "prestart", kind: "COUNTDOWN", label: "GET READY", durationSec: PRESTART_SEC, soft };
}

export function sanitizePhases(phases: TimerPhase[]): TimerPhase[] {
  // zero/negative-duration phases are invalid — dropped (0 allowed only for a
  // trailing open-ended phase)
  return phases.filter((p, i) => p.durationSec > 0 || (p.durationSec === 0 && i === phases.length - 1));
}

/** total seconds that count as workout time (excludes pre-start countdown) */
export function planWorkSeconds(plan: TimerPlan): number | null {
  let total = 0;
  for (const p of plan.phases) {
    if (p.kind === "COUNTDOWN") continue;
    if (p.durationSec === 0) return null; // open-ended
    total += p.durationSec;
  }
  return total;
}

export type EngineState = "READY" | "COUNTDOWN" | "RUNNING" | "PAUSED" | "FINISHED";

export interface EngineSnapshot {
  state: EngineState;
  phaseIndex: number;
  phase: TimerPhase | null;
  nextPhase: TimerPhase | null;
  /** seconds left in the current phase (ceil); Infinity for open-ended */
  phaseRemainingSec: number;
  phaseElapsedSec: number;
  /** countdown-mode remaining across the whole plan (null when open-ended/finished) */
  workoutRemainingSec: number | null;
  /** elapsed workout time excluding the pre-start countdown */
  workoutElapsedSec: number;
  /** logical seconds since plan start (incl. countdown) — cue tracking */
  logicalSec: number;
}

export function logicalMs(timer: TimerState, now = Date.now()): number {
  return Math.max(0, elapsedMs(timer, now) + (timer.skewMs ?? 0));
}

export function planStatus(plan: TimerPlan, timer: TimerState, now = Date.now()): EngineSnapshot {
  const phases = plan.phases;
  const firstReal = phases.find((p) => p.kind !== "COUNTDOWN") ?? null;

  if (timer.status === "idle") {
    return {
      state: "READY",
      phaseIndex: -1,
      phase: null,
      nextPhase: firstReal,
      phaseRemainingSec: firstReal?.durationSec ?? 0,
      phaseElapsedSec: 0,
      workoutRemainingSec: planWorkSeconds(plan),
      workoutElapsedSec: 0,
      logicalSec: 0,
    };
  }

  const logical = logicalMs(timer, now) / 1000;
  let cursor = 0;
  let workoutElapsed = 0;

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const open = p.durationSec === 0;
    const end = open ? Infinity : cursor + p.durationSec;
    if (logical < end || open) {
      const phaseElapsed = logical - cursor;
      const total = planWorkSeconds(plan);
      return {
        state:
          timer.status === "paused"
            ? "PAUSED"
            : p.kind === "COUNTDOWN"
              ? "COUNTDOWN"
              : "RUNNING",
        phaseIndex: i,
        phase: p,
        nextPhase: phases[i + 1] ?? null,
        phaseRemainingSec: open ? Infinity : Math.max(0, Math.ceil(end - logical)),
        phaseElapsedSec: Math.floor(phaseElapsed),
        workoutRemainingSec:
          total === null
            ? null
            : Math.max(0, Math.ceil(total - (workoutElapsed + (p.kind === "COUNTDOWN" ? 0 : phaseElapsed)))),
        workoutElapsedSec: Math.floor(workoutElapsed + (p.kind === "COUNTDOWN" ? 0 : phaseElapsed)),
        logicalSec: logical,
      };
    }
    cursor = end;
    if (p.kind !== "COUNTDOWN") workoutElapsed += p.durationSec;
  }

  return {
    state: "FINISHED",
    phaseIndex: phases.length,
    phase: null,
    nextPhase: null,
    phaseRemainingSec: 0,
    phaseElapsedSec: 0,
    workoutRemainingSec: 0,
    workoutElapsedSec: Math.floor(workoutElapsed),
    logicalSec: logical,
  };
}

// ---------- manual control: skip and ±time (expressed as skew patches) ----------

/** Skip the rest of the current phase. Returns a TimerState patch (or null). */
export function skipPhase(plan: TimerPlan, timer: TimerState, now = Date.now()): Partial<TimerState> | null {
  const snap = planStatus(plan, timer, now);
  if (snap.state === "READY" || snap.state === "FINISHED" || !snap.phase) return null;
  const remaining = snap.phaseRemainingSec === Infinity ? 0 : snap.phaseRemainingSec;
  return { skewMs: (timer.skewMs ?? 0) + remaining * 1000 };
}

/**
 * Add (+) or remove (−) seconds from the CURRENT phase. Clamped so logical
 * time never moves before the phase start or past its end.
 */
export function adjustPhase(
  plan: TimerPlan,
  timer: TimerState,
  deltaSec: number,
  now = Date.now(),
): Partial<TimerState> | null {
  const snap = planStatus(plan, timer, now);
  if (snap.state === "READY" || snap.state === "FINISHED" || !snap.phase) return null;
  if (snap.phase.durationSec === 0) return null; // open-ended
  // +time extends the phase (logical moves back), −time shortens it
  const shiftMs = -deltaSec * 1000;
  const maxForward = (snap.phaseRemainingSec === Infinity ? 0 : snap.phaseRemainingSec) * 1000;
  const maxBackward = -snap.phaseElapsedSec * 1000;
  const clamped = Math.max(maxBackward, Math.min(maxForward, shiftMs));
  return { skewMs: (timer.skewMs ?? 0) + clamped };
}

// ---------- transition cues ----------

export type CueSound = "beep" | "go" | "rest" | "end" | "warn" | "tick";

export interface Cue {
  /** logical second at which the cue fires */
  at: number;
  sound: CueSound;
  /** visual label for the transition moment ("GO", "REST", "DONE", next name) */
  label?: string;
}

function transitionCue(next: TimerPhase | null, endLabel: string): { sound: CueSound; label: string } {
  if (!next) return { sound: "end", label: endLabel }; // END ≠ GO
  if (next.kind === "REST") return { sound: "rest", label: "REST" };
  return { sound: "go", label: next.label.toUpperCase() }; // work/hold starts
}

/** every cue in the plan, as (logical second → sound) — pure and testable */
export function planCues(plan: TimerPlan): Cue[] {
  const cues: Cue[] = [];
  let cursor = 0;
  for (let i = 0; i < plan.phases.length; i++) {
    const p = plan.phases[i];
    if (p.durationSec === 0) break; // open-ended: no scheduled cues
    const end = cursor + p.durationSec;
    const t = transitionCue(plan.phases[i + 1] ?? null, plan.endLabel);
    if (p.soft) {
      // lighter cues for warm-up flows — but the workout END stays distinct
      const sound: CueSound =
        p.kind === "COUNTDOWN" ? "go" : plan.phases[i + 1] ? "tick" : "end";
      cues.push({ at: end, sound, label: t.label });
    } else {
      if (p.warnAtSec && p.durationSec > p.warnAtSec + 3) {
        cues.push({ at: end - p.warnAtSec, sound: "warn" });
      }
      // 3-2-1 beeps (only when the phase is long enough to fit them)
      if (p.durationSec > 4) {
        cues.push({ at: end - 3, sound: "beep" }, { at: end - 2, sound: "beep" }, { at: end - 1, sound: "beep" });
      }
      cues.push({ at: end, sound: t.sound, label: t.label });
    }
    cursor = end;
  }
  return cues;
}

/** cues crossed between two logical timestamps (prev, cur] */
export function cuesBetween(plan: TimerPlan, prevLogicalSec: number, curLogicalSec: number): Cue[] {
  if (curLogicalSec <= prevLogicalSec) return [];
  return planCues(plan).filter((c) => c.at > prevLogicalSec && c.at <= curLogicalSec);
}
