"use client";

import { useEffect, useState } from "react";
import type { WarmupResult, WarmupSection } from "@/lib/types";
import { WARMUP_MOVEMENTS_BY_ID } from "@/lib/seed/warmups";
import { setWarmupNote, updateTimer, updateWarmup } from "@/lib/session/store";
import { useTicker } from "@/lib/session/timer";
import { planStatus } from "@/lib/timing/engine";
import { warmupPlan } from "@/lib/timing/builders";
import { InfoButton, InfoSheet, type MovementInfo } from "@/components/InfoSheet";
import { NoteField } from "@/components/NoteField";
import { TimerPlanPlayer } from "./TimerPlanPlayer";

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
 * Free Movement warm-up: one TimerPlan drives the whole flow (the engine
 * advances by time; Skip is the manual advance). The "i" sheet never
 * interrupts the timer.
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
  // keep the derived movement index fresh while the plan runs (the player
  // ticks itself; this card needs its own ticks for the info buttons + sync)
  useTicker(result.timer.status === "running");

  const total = section.movements.length;
  const plan = warmupPlan(section);
  const snap = planStatus(plan, result.timer);
  const finished = snap.state === "FINISHED" || result.completed;

  // rounds are 1-based per movement; COUNTDOWN/READY have no round → index 0 ("up next")
  const currentIdx = snap.phase?.round ? snap.phase.round - 1 : 0;
  const nextIdx = snap.nextPhase?.round !== undefined ? snap.nextPhase.round - 1 : null;

  const currentMovement = !finished ? section.movements[currentIdx] : undefined;
  const nextMovement =
    !finished && nextIdx !== null && nextIdx !== currentIdx ? section.movements[nextIdx] : undefined;

  // sync derived progress into the persisted result (store writes, not setState)
  useEffect(() => {
    if (readOnly || finished) return; // finished values are written by onFinished
    if (result.currentIndex !== currentIdx || result.movementsDone !== currentIdx) {
      updateWarmup(section.id, { currentIndex: currentIdx, movementsDone: currentIdx });
    }
  }, [readOnly, finished, result.currentIndex, result.movementsDone, currentIdx, section.id]);

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
      <p className="label">{section.targetMinutes} MIN</p>
      {section.intro && <p className="text-sm text-mid">{section.intro}</p>}

      <TimerPlanPlayer
        plan={plan}
        timer={result.timer}
        onPatch={(p) => updateTimer(section.id, "warmup", p)}
        onFinished={() =>
          updateWarmup(section.id, {
            completed: true,
            movementsDone: section.movements.length,
            currentIndex: section.movements.length - 1,
          })
        }
        allowSkip
        startLabel="START WARM-UP"
      />

      {/* how-to sheets for the current + next movement, without touching the timer */}
      {(currentMovement || nextMovement) && (
        <div className="flex items-center justify-between gap-2 px-1">
          {currentMovement && (
            <div className="flex items-center gap-1">
              <InfoButton
                onOpen={() => setInfo(currentMovement.movementId)}
                label={`current movement — ${WARMUP_MOVEMENTS_BY_ID[currentMovement.movementId]?.name ?? currentMovement.movementId}`}
              />
              <span className="text-sm text-low">{snap.state === "READY" || snap.state === "COUNTDOWN" ? "Up next" : "Current"}</span>
            </div>
          )}
          {nextMovement && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-low">Next</span>
              <InfoButton
                onOpen={() => setInfo(nextMovement.movementId)}
                label={`next movement — ${WARMUP_MOVEMENTS_BY_ID[nextMovement.movementId]?.name ?? nextMovement.movementId}`}
              />
            </div>
          )}
        </div>
      )}

      <div className="border-t border-line pt-1">
        <NoteField note={result.note} onSave={(t) => setWarmupNote(section.id, t)} placeholder="Add warm-up note…" />
      </div>

      {info && <InfoSheet info={movementInfo(info)} onClose={() => setInfo(null)} />}
    </div>
  );
}
