"use client";

import { useEffect } from "react";
import type { TimerState } from "@/lib/types";
import { elapsedSec, timerFinish, timerPause, timerStart, useTicker } from "@/lib/session/timer";
import { cls, formatClock } from "@/lib/util";

/**
 * V1 timer (spec §26): Start / Pause / Resume / Finish. State is persisted
 * (epoch-based), so it survives navigation and reload.
 */
export function TimerBar({
  timer,
  totalSec,
  onPatch,
  onFinished,
}: {
  timer: TimerState;
  /** countdown target; omit for a count-up stopwatch */
  totalSec?: number;
  onPatch: (patch: Partial<TimerState>) => void;
  onFinished?: () => void;
}) {
  useTicker(timer.status === "running");
  const elapsed = elapsedSec(timer);
  const remaining = totalSec !== undefined ? Math.max(0, totalSec - elapsed) : null;
  const timeUp = remaining === 0 && totalSec !== undefined && timer.status === "running";

  // auto-stop countdown at zero (effect, not during render)
  useEffect(() => {
    if (timeUp) {
      onPatch(timerFinish(timer));
      onFinished?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const display = remaining !== null ? remaining : elapsed;
  const finished = timer.status === "finished";
  const lastMinute = remaining !== null && remaining <= 60 && remaining > 0;

  const btn =
    "flex h-12 min-w-24 items-center justify-center rounded-xl font-display text-lg font-bold tracking-wide active:scale-[0.97]";

  return (
    <div className="rounded-2xl border border-line bg-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cls(
            "font-display text-5xl font-bold tnum leading-none",
            finished ? "text-volt" : lastMinute ? "text-med" : "text-hi",
          )}
          aria-live="polite"
        >
          {finished && remaining !== null ? "TIME" : formatClock(display)}
        </span>
        <div className="flex gap-2">
          {timer.status === "idle" && (
            <button type="button" className={cls(btn, "bg-volt text-onvolt")} onClick={() => onPatch(timerStart(timer))}>
              START
            </button>
          )}
          {timer.status === "running" && (
            <button type="button" className={cls(btn, "border border-line bg-surface text-hi")} onClick={() => onPatch(timerPause(timer))}>
              PAUSE
            </button>
          )}
          {timer.status === "paused" && (
            <>
              <button type="button" className={cls(btn, "bg-volt text-onvolt")} onClick={() => onPatch(timerStart(timer))}>
                RESUME
              </button>
              <button
                type="button"
                className={cls(btn, "border border-line bg-surface text-mid")}
                onClick={() => {
                  onPatch(timerFinish(timer));
                  onFinished?.();
                }}
              >
                FINISH
              </button>
            </>
          )}
          {timer.status === "running" && (
            <button
              type="button"
              className={cls(btn, "border border-line bg-surface text-mid")}
              onClick={() => {
                onPatch(timerFinish(timer));
                onFinished?.();
              }}
            >
              FINISH
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
