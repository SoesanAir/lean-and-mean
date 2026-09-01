"use client";

import { useEffect, useState } from "react";
import type { WarmupResult, WarmupSection } from "@/lib/types";
import { WARMUP_MOVEMENTS_BY_ID } from "@/lib/seed/warmups";
import { setWarmupNote, updateTimer, updateWarmup } from "@/lib/session/store";
import { elapsedSec, timerStart, useTicker } from "@/lib/session/timer";
import { InfoButton, InfoSheet, type MovementInfo } from "@/components/InfoSheet";
import { NoteField } from "@/components/NoteField";
import { cls } from "@/lib/util";

function movementInfo(movementId: string): MovementInfo {
  const m = WARMUP_MOVEMENTS_BY_ID[movementId];
  if (!m) return { name: movementId, instructions: ["Movement definition not found."] };
  return {
    name: m.name,
    shortCue: m.shortCue,
    instructions: m.instructions,
    tips: m.tips,
    videoUrl: m.videoUrl,
    youtubeQuery: m.name,
  };
}

/**
 * Free Movement warm-up player: ~30 s per movement, auto-advances, no set
 * rest. The "i" sheet never interrupts the timer.
 */
export function WarmupCard({
  section,
  result,
  readOnly,
}: {
  section: WarmupSection;
  result: WarmupResult;
  readOnly?: boolean;
}) {
  const [info, setInfo] = useState<string | null>(null);
  const running = result.timer.status === "running";
  useTicker(running);

  const total = section.movements.length;
  const idx = Math.min(result.currentIndex, total - 1);
  const current = section.movements[idx];
  const next = section.movements[idx + 1];
  const segElapsed = elapsedSec(result.timer);
  const segRemaining = Math.max(0, current.durationSeconds - segElapsed);
  const done = result.completed;

  const advance = (from: number) => {
    if (from + 1 >= total) {
      updateWarmup(section.id, {
        completed: true,
        movementsDone: total,
        currentIndex: total - 1,
        timer: { status: "finished", elapsedBeforePauseMs: 0 },
      });
    } else {
      updateWarmup(section.id, {
        currentIndex: from + 1,
        movementsDone: from + 1,
        // auto-start the next movement's segment
        timer: { status: "running", startedAt: Date.now(), elapsedBeforePauseMs: 0 },
      });
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
  };

  // auto-advance when the segment ends
  useEffect(() => {
    if (!readOnly && running && segRemaining === 0 && !done) advance(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, segRemaining, idx, done, readOnly]);

  if (readOnly) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-mid">
          {result.completed ? `Completed — ${total} movements.` : `${result.movementsDone}/${total} movements.`}
        </p>
        <ul className="mt-2 space-y-1">
          {section.movements.map((m, i) => (
            <li key={i} className="text-sm text-hi">
              {WARMUP_MOVEMENTS_BY_ID[m.movementId]?.name ?? m.movementId}
            </li>
          ))}
        </ul>
        {result.note?.text && <p className="mt-2 text-sm italic text-mid">“{result.note.text}”</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="label">
          {section.targetMinutes} MIN · MOVEMENT {Math.min(idx + 1, total)}/{total}
        </p>
        <span className="font-display text-lg font-bold text-volt tnum">
          {done ? "DONE" : `${segRemaining}s`}
        </span>
      </div>
      {section.intro && <p className="text-sm text-mid">{section.intro}</p>}

      {done ? (
        <p className="rounded-xl border border-volt/40 bg-volt/10 px-3 py-3 text-center font-display text-xl font-bold text-volt">
          WARM-UP COMPLETE
        </p>
      ) : (
        <>
          {/* current movement */}
          <div className="rounded-2xl border border-volt/40 bg-raised p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-tight">
                  {WARMUP_MOVEMENTS_BY_ID[current.movementId]?.name ?? current.movementId}
                </p>
                <p className="mt-0.5 text-sm text-mid">
                  {WARMUP_MOVEMENTS_BY_ID[current.movementId]?.shortCue}
                </p>
              </div>
              <InfoButton onOpen={() => setInfo(current.movementId)} label="current movement" />
            </div>
            {/* segment progress */}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-volt transition-[width] duration-300"
                style={{ width: `${Math.min(100, (segElapsed / current.durationSeconds) * 100)}%` }}
              />
            </div>
          </div>

          {/* next up */}
          {next && (
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm text-low">
                Next: <span className="text-mid">{WARMUP_MOVEMENTS_BY_ID[next.movementId]?.name ?? next.movementId}</span>
              </p>
              <InfoButton onOpen={() => setInfo(next.movementId)} label="next movement" />
            </div>
          )}

          <div className="flex gap-2">
            {result.timer.status === "idle" ? (
              <button
                type="button"
                onClick={() => updateTimer(section.id, "warmup", timerStart(result.timer))}
                className="h-13 min-h-12 flex-1 rounded-xl bg-volt font-display text-lg font-bold text-onvolt active:scale-[0.98]"
              >
                START WARM-UP
              </button>
            ) : (
              <button
                type="button"
                onClick={() => advance(idx)}
                className={cls(
                  "h-13 min-h-12 flex-1 rounded-xl border border-line bg-raised font-display text-base font-semibold text-hi active:scale-[0.98]",
                )}
              >
                {idx + 1 >= total ? "FINISH WARM-UP" : "NEXT MOVEMENT"}
              </button>
            )}
          </div>
        </>
      )}

      <div className="border-t border-line pt-1">
        <NoteField note={result.note} onSave={(t) => setWarmupNote(section.id, t)} placeholder="Add warm-up note…" />
      </div>

      {info && <InfoSheet info={movementInfo(info)} onClose={() => setInfo(null)} />}
    </div>
  );
}
