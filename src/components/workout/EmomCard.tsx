"use client";

import type { EmomSection, TimedBlockResult } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { BlockWeightBanner, CheckCircle, CueList, Disclosure, GripBadge } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { completeAllCycles, setCycleNote, setTimedBlockNote, updateCycle, updateTimedBlock, updateTimer } from "@/lib/session/store";
import { emomPlan } from "@/lib/timing/builders";
import { movementLabel } from "./format";
import { TimerPlanPlayer } from "./TimerPlanPlayer";

export function EmomCard({
  section,
  result,
  readOnly,
}: {
  section: EmomSection;
  result: TimedBlockResult;
  readOnly?: boolean;
}) {
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
        <TimerPlanPlayer
          plan={emomPlan(section)}
          timer={result.timer}
          onPatch={(p) => updateTimer(section.id, "timedBlock", p)}
          onFinished={() =>
            updateTimedBlock(section.id, {
              completed: true,
              completedMinutes: result.completedMinutes ?? doneMinutes,
            })
          }
          allowSkip
        />
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
                <NoteField note={c.note} onSave={(t) => setCycleNote(section.id, c.index, t)} placeholder="Add minute note…" />
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
