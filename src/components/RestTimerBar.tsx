"use client";

import { useEffect, useRef } from "react";
import { adjustRest, restRemainingSec, skipRest, useRestTimer } from "@/lib/session/restTimer";
import { useTicker } from "@/lib/session/timer";
import { cls, formatClock } from "@/lib/util";

/**
 * Non-blocking rest countdown, floating above the bottom nav. The workout
 * stays fully interactive while resting. At zero: flash + vibration, then
 * the bar dismisses itself.
 */
export function RestTimerBar() {
  const timer = useRestTimer();
  useTicker(timer !== null);
  const notified = useRef<string | null>(null);

  const remaining = timer ? restRemainingSec(timer) : 0;
  const atZero = timer !== null && remaining === 0;

  useEffect(() => {
    if (atZero && timer && notified.current !== timer.key) {
      notified.current = timer.key;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([120, 80, 120]);
      }
      const t = setTimeout(() => skipRest(), 4000); // auto-dismiss after the "GO" moment
      return () => clearTimeout(t);
    }
  }, [atZero, timer]);

  if (!timer) return null;

  const progress = timer.totalSeconds > 0 ? remaining / timer.totalSeconds : 0;
  const btn =
    "flex h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-xs font-bold text-hi active:scale-[0.95]";

  return (
    <div
      className={cls(
        "fixed inset-x-0 z-40 mx-auto w-full max-w-md px-3",
      )}
      style={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
      role="timer"
      aria-live="polite"
      aria-label={atZero ? "Rest over" : `Rest: ${remaining} seconds. ${timer.nextLabel}`}
    >
      <div
        className={cls(
          "overflow-hidden rounded-2xl border shadow-lg backdrop-blur",
          atZero ? "animate-pulse border-volt bg-volt/20" : "border-line bg-raised/95",
        )}
      >
        <div className="flex items-center gap-3 p-3">
          <span
            className={cls(
              "font-display text-3xl font-bold tnum leading-none",
              atZero ? "text-volt" : "text-hi",
            )}
          >
            {atZero ? "GO" : formatClock(remaining)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="label">{atZero ? "REST OVER" : "RESTING"}</p>
            <p className="truncate text-sm text-hi">Next: {timer.nextLabel}</p>
          </div>
          {!atZero && (
            <>
              <button type="button" className={btn} onClick={() => adjustRest(-15)} aria-label="15 seconds less rest">
                −15
              </button>
              <button type="button" className={btn} onClick={() => adjustRest(15)} aria-label="15 seconds more rest">
                +15
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => skipRest()}
            aria-label="Skip rest"
            className="flex h-11 min-w-11 items-center justify-center rounded-lg bg-volt px-2.5 font-display text-xs font-bold text-onvolt active:scale-[0.95]"
          >
            {atZero ? "OK" : "SKIP"}
          </button>
        </div>
        {/* draining progress bar */}
        {!atZero && (
          <div className="h-1 w-full bg-surface">
            <div
              className="h-full bg-volt transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
