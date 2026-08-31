"use client";

import type { SetResult, SetsPrescription } from "@/lib/types";
import { CheckCircle, Stepper } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { defaultReps } from "./format";

export function SetRow({
  prescription,
  set,
  label,
  onPatch,
  onNote,
}: {
  prescription: SetsPrescription;
  set: SetResult;
  label: string;
  onPatch: (patch: Partial<SetResult>) => void;
  onNote: (text: string) => void;
}) {
  const p = prescription;

  const toggle = () => {
    if (set.completed) {
      onPatch({ completed: false });
      return;
    }
    // completing a set defaults actuals to the prescription — zero typing
    const patch: Partial<SetResult> = { completed: true, skipped: false };
    if (p.durationSec && set.actualDurationSec === undefined) {
      patch.actualDurationSec = p.durationSec;
    }
    if (!p.durationSec) {
      const d = defaultReps(p.reps);
      if (p.perSide) {
        if (set.actualRepsLeft === undefined) patch.actualRepsLeft = d;
        if (set.actualRepsRight === undefined) patch.actualRepsRight = d;
      } else if (set.actualReps === undefined) {
        patch.actualReps = d;
      }
    }
    onPatch(patch);
  };

  return (
    <div className="border-t border-line py-2 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <div className="flex items-center gap-2">
          {set.skipped && (
            <span className="label rounded-md bg-med/15 px-2 py-0.5 text-med">
              {set.skipReason ?? "SKIPPED"}
            </span>
          )}
          <CheckCircle checked={set.completed} onToggle={toggle} label={`${label} complete`} />
        </div>
      </div>

      {set.completed && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {p.durationSec ? (
            <Stepper
              label={`${label} seconds`}
              value={set.actualDurationSec ?? p.durationSec}
              step={5}
              suffix="s"
              onChange={(v) => onPatch({ actualDurationSec: v })}
            />
          ) : p.perSide ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="label">L</span>
                <Stepper
                  label={`${label} reps left`}
                  value={set.actualRepsLeft ?? defaultReps(p.reps)}
                  onChange={(v) => onPatch({ actualRepsLeft: v })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="label">R</span>
                <Stepper
                  label={`${label} reps right`}
                  value={set.actualRepsRight ?? defaultReps(p.reps)}
                  onChange={(v) => onPatch({ actualRepsRight: v })}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="label">Reps</span>
              <Stepper
                label={`${label} reps`}
                value={set.actualReps ?? defaultReps(p.reps)}
                onChange={(v) => onPatch({ actualReps: v })}
              />
            </div>
          )}
        </div>
      )}

      <NoteField note={set.note} onSave={onNote} placeholder="Add set note…" />
    </div>
  );
}
