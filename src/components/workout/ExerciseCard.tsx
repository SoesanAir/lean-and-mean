"use client";

import type { ExerciseResult, SetsPrescription } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { CueList, Disclosure, GripBadge, WeightDisplay } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { SetRow } from "./SetRow";
import { prescriptionLabel } from "./format";
import { planRestAfterSet } from "@/lib/session/restLogic";
import { startRest } from "@/lib/session/restTimer";
import {
  setExerciseNote,
  setSetNote,
  updateSetResult,
} from "@/lib/session/store";

/**
 * Exercise card (spec §10): weight + grip extremely visible, technique cues
 * accessible without leaving the workout, per-set logging + notes.
 * In CIRCUIT sections rows are labeled ROUND n instead of SET n.
 */
export function ExerciseCard({
  sectionId,
  prescription,
  result,
  rounds,
  readOnly,
}: {
  sectionId: string;
  prescription: SetsPrescription;
  result: ExerciseResult;
  rounds?: number; // present for CIRCUIT sections
  readOnly?: boolean;
}) {
  const p = prescription;
  const exercise = getExercise(p.exerciseId);
  const name = p.displayName ?? exercise.name;
  const cues = p.watchFor ?? exercise.watchFor;
  const purpose = p.purpose ?? exercise.purpose;
  const isBodyweight = p.grip === "BODYWEIGHT" || (p.weightKg === undefined && exercise.equipment.includes("BODYWEIGHT"));

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-display text-2xl font-bold leading-tight">{name}</h3>

      {/* weight + grip — the two most visible data points (spec §5/§11) */}
      <div className="mt-2 flex items-center justify-between gap-3">
        {p.weightKg !== undefined ? (
          <WeightDisplay kg={p.weightKg} />
        ) : (
          <span className="font-display text-2xl font-semibold text-mid">
            {isBodyweight ? "BODYWEIGHT" : "—"}
          </span>
        )}
        <GripBadge grip={p.grip} gripNotes={p.gripNotes} />
      </div>

      <p className="mt-1 text-lg font-semibold text-hi">
        {prescriptionLabel(p)}
        {p.tempo && <span className="ml-2 text-sm font-normal text-mid">tempo: {p.tempo}</span>}
      </p>

      {purpose.length > 0 && (
        <p className="mt-1 text-sm text-low">{purpose.join(" · ")}</p>
      )}

      <div className="mt-3 space-y-2">
        <Disclosure label="WATCH FOR" accent>
          <CueList items={cues} />
        </Disclosure>
        {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
          <Disclosure label="COMMON MISTAKES">
            <CueList items={exercise.commonMistakes} />
          </Disclosure>
        )}
      </div>

      <div className="mt-3">
        {result.sets.map((set, i) => {
          const label =
            rounds !== undefined
              ? `ROUND ${i + 1}`
              : `SET ${i + 1}`;
          return readOnly ? (
            <ReadOnlySetRow key={i} label={label} set={set} prescription={p} />
          ) : (
            <SetRow
              key={i}
              label={label}
              prescription={p}
              set={set}
              onPatch={(patch) => {
                updateSetResult(sectionId, p.id, i, patch);
                // auto-rest: only when completing (not un-checking) and only
                // if another set of THIS exercise remains (spec: no timer
                // after the final set / between exercises)
                if (patch.completed === true) {
                  const plan = planRestAfterSet(
                    rounds !== undefined ? "CIRCUIT" : "STRAIGHT_SETS",
                    p,
                    result.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
                    i,
                  );
                  if (plan) {
                    startRest(
                      `${sectionId}/${p.id}/${i}`,
                      `Set ${plan.nextSetIndex + 1} — ${name}`,
                      plan.seconds,
                    );
                  }
                }
              }}
              onNote={(text) => setSetNote(sectionId, p.id, i, text)}
            />
          );
        })}
      </div>

      <div className="mt-2 border-t border-line pt-1">
        {readOnly ? (
          result.note?.text && <p className="px-2 py-1 text-sm italic text-hi">“{result.note.text}”</p>
        ) : (
          <NoteField
            note={result.note}
            onSave={(text) => setExerciseNote(sectionId, p.id, text)}
            placeholder="Add exercise note…"
          />
        )}
      </div>
    </div>
  );
}

function ReadOnlySetRow({
  label,
  set,
  prescription,
}: {
  label: string;
  set: import("@/lib/types").SetResult;
  prescription: SetsPrescription;
}) {
  const actual = prescription.durationSec
    ? set.actualDurationSec !== undefined
      ? `${set.actualDurationSec} sec`
      : "—"
    : prescription.perSide
      ? `L ${set.actualRepsLeft ?? "—"} / R ${set.actualRepsRight ?? "—"}`
      : `${set.actualReps ?? "—"} reps`;
  return (
    <div className="border-t border-line py-2 first:border-t-0">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="flex items-center gap-2 text-sm tnum">
          {set.skipped ? (
            <span className="label text-med">{set.skipReason ?? "SKIPPED"}</span>
          ) : set.completed ? (
            <>
              <span className="text-hi">{actual}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-volt" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="completed">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </>
          ) : (
            <span className="text-low">not done</span>
          )}
        </span>
      </div>
      {set.note?.text && <p className="mt-1 text-sm italic text-mid">“{set.note.text}”</p>}
    </div>
  );
}
