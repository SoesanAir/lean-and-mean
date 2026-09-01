"use client";

// THE workout timer player — executes any TimerPlan (EMOM, AMRAP, intervals,
// warm-up flows, holds, For Time). Workout-specific cards just build a plan
// and render this. All timing is derived from the persisted TimerState via
// the pure engine, so pause/refresh/backgrounding are handled in one place.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TimerState } from "@/lib/types";
import {
  adjustPhase,
  cuesBetween,
  planStatus,
  skipPhase,
  type TimerPlan,
} from "@/lib/timing/engine";
import { armAudio, isSoundEnabled, playCue, setSoundEnabled, subscribeSound } from "@/lib/timing/audio";
import { timerFinish, timerPause, timerStart, useTicker } from "@/lib/session/timer";
import { cls, formatClock } from "@/lib/util";

function useSound(): boolean {
  return useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);
}

export function TimerPlanPlayer({
  plan,
  timer,
  onPatch,
  onFinished,
  allowSkip = true,
  allowAdjust = false,
  startLabel = "START",
}: {
  plan: TimerPlan;
  timer: TimerState;
  onPatch: (patch: Partial<TimerState>) => void;
  onFinished?: () => void;
  allowSkip?: boolean;
  allowAdjust?: boolean;
  startLabel?: string;
}) {
  const soundOn = useSound();
  const running = timer.status === "running";
  useTicker(running);

  const snap = planStatus(plan, timer);
  const lastLogical = useRef(0);
  const finishedFired = useRef(false);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flash, setFlash] = useState<{ label: string } | null>(null);

  // cue playback at real boundaries (250 ms tick; audio scheduled immediately)
  useEffect(() => {
    if (!running) return;
    const cur = snap.logicalSec;
    const prev = lastLogical.current;
    lastLogical.current = cur;
    if (cur <= prev) return;
    if (cur - prev > 2.5) return; // background/skip jump — resync silently, no stale beeps
    for (const cue of cuesBetween(plan, prev, cur)) {
      playCue(cue.sound);
      if (cue.label) {
        setFlash({ label: cue.label });
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setFlash(null), 1200);
      }
    }
  }, [running, snap.logicalSec, plan]);

  // clear any pending flash timeout on unmount
  useEffect(() => () => {
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
  }, []);

  // finishing the final phase: freeze the timer + notify exactly once
  useEffect(() => {
    if (snap.state === "FINISHED" && timer.status === "running" && !finishedFired.current) {
      finishedFired.current = true;
      onPatch(timerFinish(timer));
      onFinished?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.state, timer.status]);

  const phase = snap.phase;
  const isCountdown = snap.state === "COUNTDOWN";
  const openEnded = phase?.durationSec === 0;

  // which clock is the big one?
  const bigClock = isCountdown
    ? `${Math.max(1, Math.min(3, snap.phaseRemainingSec))}`
    : plan.mode === "AMRAP"
      ? formatClock(snap.workoutRemainingSec ?? 0)
      : plan.mode === "FORTIME"
        ? formatClock(snap.workoutElapsedSec)
        : openEnded
          ? formatClock(snap.phaseElapsedSec)
          : formatClock(snap.phaseRemainingSec === Infinity ? 0 : snap.phaseRemainingSec);

  const showFlash = flash !== null;
  const inFinal3 = !isCountdown && !openEnded && phase && !phase.soft && snap.phaseRemainingSec <= 3 && snap.phaseRemainingSec > 0 && running;

  const btn =
    "flex h-12 items-center justify-center rounded-xl font-display text-base font-bold tracking-wide active:scale-[0.97]";

  if (snap.state === "READY") {
    return (
      <div className="rounded-2xl border border-line bg-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="label">FIRST UP</p>
            <p className="truncate font-display text-xl font-bold">{snap.nextPhase?.label}</p>
            {snap.workoutRemainingSec !== null && (
              <p className="text-sm text-mid tnum">{formatClock(snap.workoutRemainingSec)} total</p>
            )}
          </div>
          <button
            type="button"
            className={cls(btn, "min-w-28 bg-volt px-4 text-onvolt")}
            onClick={() => {
              armAudio(); // unlock cue audio from this user gesture (music-safe)
              onPatch(timerStart(timer));
            }}
          >
            {startLabel}
          </button>
        </div>
        <SoundToggle on={soundOn} />
      </div>
    );
  }

  if (snap.state === "FINISHED") {
    return (
      <div className="rounded-2xl border border-volt/40 bg-volt/10 p-4 text-center">
        <p className="font-display text-3xl font-bold text-volt">{plan.endLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={cls(
        "rounded-2xl border p-4 transition-colors",
        isCountdown || inFinal3 ? "border-volt bg-volt/10" : phase?.kind === "REST" ? "border-lite/40 bg-raised" : "border-line bg-raised",
      )}
    >
      {/* context: Round 3/5 · Minute 7/12 */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="label">
          {isCountdown
            ? "GET READY"
            : phase?.round !== undefined
              ? `${phase.roundWord ?? "Round"} ${phase.round}/${phase.totalRounds}`
              : plan.mode}
        </p>
        {plan.mode !== "AMRAP" && snap.workoutRemainingSec !== null && !isCountdown && (
          <span className="text-xs text-low tnum">{formatClock(snap.workoutRemainingSec)} left</span>
        )}
        {plan.mode === "FORTIME" && phase?.durationSec !== 0 && snap.workoutRemainingSec !== null && (
          <span className="text-xs text-med tnum">cap {formatClock(snap.workoutRemainingSec)}</span>
        )}
      </div>

      {/* CURRENT */}
      <div className="mt-1 text-center">
        {showFlash ? (
          <p className="font-display text-4xl font-bold text-volt">{flash.label}</p>
        ) : (
          <p
            className={cls(
              "truncate font-display text-3xl font-bold leading-tight",
              phase?.kind === "REST" ? "text-lite" : "text-hi",
            )}
          >
            {isCountdown ? "STARTING…" : phase?.label}
          </p>
        )}
        {!isCountdown && phase?.detail && !showFlash && (
          <p className="mt-0.5 truncate text-sm text-mid">{phase.detail}</p>
        )}
        <p
          className={cls(
            "mt-1 font-display font-bold tnum leading-none",
            isCountdown || inFinal3 ? "text-7xl text-volt" : "text-6xl",
          )}
          aria-live="polite"
        >
          {inFinal3 ? snap.phaseRemainingSec : bigClock}
        </p>
      </div>

      {/* NEXT — the athlete never has to remember the sequence */}
      {snap.nextPhase && (
        <p className="mt-2 truncate text-center text-sm text-mid">
          Next: {snap.nextPhase.label}
          {snap.nextPhase.durationSec > 0 && ` — ${snap.nextPhase.durationSec} sec`}
        </p>
      )}

      {/* controls */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {timer.status === "paused" ? (
          <button type="button" className={cls(btn, "min-w-24 bg-volt px-3 text-onvolt")} onClick={() => onPatch(timerStart(timer))}>
            RESUME
          </button>
        ) : (
          <button type="button" className={cls(btn, "border border-line bg-surface px-3 text-hi")} onClick={() => onPatch(timerPause(timer))}>
            PAUSE
          </button>
        )}
        {allowAdjust && !isCountdown && !openEnded && (
          <>
            <button type="button" className={cls(btn, "border border-line bg-surface px-2.5 text-xs text-hi")} onClick={() => { const p = adjustPhase(plan, timer, -15); if (p) onPatch(p); }} aria-label="15 seconds less">
              −15
            </button>
            <button type="button" className={cls(btn, "border border-line bg-surface px-2.5 text-xs text-hi")} onClick={() => { const p = adjustPhase(plan, timer, 15); if (p) onPatch(p); }} aria-label="15 seconds more">
              +15
            </button>
          </>
        )}
        {allowSkip && (
          <button
            type="button"
            className={cls(btn, "border border-line bg-surface px-3 text-mid")}
            onClick={() => {
              const p = skipPhase(plan, timer);
              if (p) onPatch(p);
              lastLogical.current = -100; // forces gap-resync: skipped phases never replay cues
            }}
          >
            {openEnded ? "FINISH" : "SKIP"}
          </button>
        )}
        <SoundToggle on={soundOn} compact />
      </div>
    </div>
  );
}

function SoundToggle({ on, compact }: { on: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!on)}
      aria-label={on ? "Timer sounds on — tap to mute" : "Timer sounds off — tap to unmute"}
      aria-pressed={on}
      className={cls(
        "flex h-11 w-11 items-center justify-center rounded-lg active:scale-[0.9]",
        on ? "text-volt" : "text-low",
        !compact && "mx-auto mt-1",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="M22 9l-6 6M16 9l6 6" />}
      </svg>
    </button>
  );
}
