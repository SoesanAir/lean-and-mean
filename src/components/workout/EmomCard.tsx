"use client";

import type { EmomSection, TimedBlockResult } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { BlockWeightBanner, CheckCircle, CueList, Disclosure, GripBadge } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { completeAllCycles, setCycleNote, setTimedBlockNote, updateCycle, updateTimedBlock, updateTimer } from "@/lib/session/store";
import { elapsedSec, useTicker } from "@/lib/session/timer";
import { movementLabel } from "./format";
import { TimerBar } from "./TimerBar";

export function EmomCard({
  section,
  result,
  readOnly,
}: {
  section: EmomSection;
  result: TimedBlockResult;
  readOnly?: boolean;
}) {
  useTicker(result.timer.status === "running");
  const elapsed = elapsedSec(result.timer);
  const running = result.timer.status === "running";
  const minuteIdx = Math.min(section.minutes - 1, Math.floor(elapsed / 60));
  const secInMinute = elapsed % 60;
  const current = section.pattern[minuteIdx % section.pattern.length];
  const next = section.pattern[(minuteIdx + 1) % section.pattern.length];
  const cycleNo = Math.floor(minuteIdx / section.pattern.length) + 1;
  const totalCycles = Math.ceil(section.minutes / section.pattern.length);

  const doneMinutes = result.cycles.filter((c) => c.completed).length;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-bold">{section.minutes} MIN EMOM</h3>
        <span className="label">
          {doneMinutes}/{section.minutes} MIN
        </span>
      </div>

      {/* spec §13: ONE weight for the entire block */}
      <BlockWeightBanner kg={section.blockWeightKg} label="ENTIRE BLOCK" />
      {section.intro && <p className="text-sm text-mid">{section.intro}</p>}

      {!readOnly && (
        <>
          <TimerBar
            timer={result.timer}
            totalSec={section.minutes * 60}
            onPatch={(patch) => updateTimer(section.id, "timedBlock", patch)}
            onFinished={() =>
              updateTimedBlock(section.id, {
                completed: true,
                completedMinutes: result.completedMinutes ?? doneMinutes,
              })
            }
          />

          {/* EMOM cockpit display (spec §26) */}
          {running && (
            <div className="rounded-2xl border border-volt/40 bg-raised p-4 text-center">
              <p className="label text-volt">
                MINUTE {minuteIdx + 1} / {section.minutes}
                {section.pattern.length > 1 && ` · CYCLE ${cycleNo} / ${totalCycles}`}
              </p>
              <p className="mt-1 font-display text-3xl font-bold leading-tight">
                {(current.displayName ?? getExercise(current.exerciseId).name).toUpperCase()}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-hi tnum">
                {movementLabel(current)} REPS
                {section.blockWeightKg !== null && !current.bodyweight && (
                  <span className="text-volt"> · {section.blockWeightKg} KG</span>
                )}
              </p>
              <div className="mt-2 flex justify-center">
                <GripBadge grip={current.grip} gripNotes={current.gripNotes} />
              </div>
              {secInMinute >= 50 && section.pattern.length > 1 && (
                <p className="mt-2 text-sm text-med" aria-live="polite">
                  NEXT: {(next.displayName ?? getExercise(next.exerciseId).name).toUpperCase()}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* movement reference + cues */}
      <div className="space-y-2">
        {section.pattern.map((m) => {
          const ex = getExercise(m.exerciseId);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <div>
                <p className="font-semibold">{m.displayName ?? ex.name}</p>
                <p className="text-sm text-mid tnum">{movementLabel(m)} reps / min</p>
              </div>
              <GripBadge grip={m.grip} gripNotes={m.gripNotes} />
            </div>
          );
        })}
        <Disclosure label="WATCH FOR" accent>
          <CueList items={section.pattern.flatMap((m) => m.watchFor ?? getExercise(m.exerciseId).watchFor)} />
        </Disclosure>
      </div>

      {/* per-minute tracking (spec Day 3: track each minute) */}
      <Disclosure label={`MINUTES (${doneMinutes}/${section.minutes})`}>
        <div>
          {result.cycles.map((c) => (
            <div key={c.index} className="border-t border-line py-2 first:border-t-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.label}</span>
                {readOnly ? (
                  <span className={c.completed ? "text-volt" : "text-low"}>{c.completed ? "✓" : "—"}</span>
                ) : (
                  <CheckCircle
                    checked={c.completed}
                    onToggle={() => updateCycle(section.id, c.index, { completed: !c.completed })}
                    label={`${c.label} complete`}
                  />
                )}
              </div>
              {readOnly ? (
                c.note?.text && <p className="text-sm italic text-mid">“{c.note.text}”</p>
              ) : (
                <NoteField compact note={c.note} onSave={(t) => setCycleNote(section.id, c.index, t)} placeholder="Add minute note…" />
              )}
            </div>
          ))}
        </div>
      </Disclosure>

      {!readOnly && (
        <button
          type="button"
          onClick={() => completeAllCycles(section.id)}
          className="h-12 w-full rounded-xl border border-line bg-raised font-display text-lg font-bold text-hi active:scale-[0.98]"
        >
          MARK ALL MINUTES DONE
        </button>
      )}

      <div className="border-t border-line pt-1">
        {readOnly ? (
          result.note?.text && <p className="text-sm italic text-mid">“{result.note.text}”</p>
        ) : (
          <NoteField note={result.note} onSave={(t) => setTimedBlockNote(section.id, t)} placeholder="Add block note…" />
        )}
      </div>
    </div>
  );
}
