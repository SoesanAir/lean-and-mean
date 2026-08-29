"use client";

import type { AmrapSection, Difficulty1to5, TimedBlockResult } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { BlockWeightBanner, CueList, Disclosure, GripBadge, Stepper } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { setTimedBlockNote, updateTimedBlock, updateTimer } from "@/lib/session/store";
import { cls } from "@/lib/util";
import { movementLabel } from "./format";
import { TimerBar } from "./TimerBar";

export function AmrapCard({
  section,
  result,
  readOnly,
}: {
  section: AmrapSection;
  result: TimedBlockResult;
  readOnly?: boolean;
}) {
  const rounds = result.completedRounds ?? 0;
  const extra = result.extraReps ?? 0;
  const summary = `${rounds} round${rounds === 1 ? "" : "s"} + ${extra} reps`;

  const setResult = (patch: Partial<TimedBlockResult>) => {
    const r = patch.completedRounds ?? rounds;
    const e = patch.extraReps ?? extra;
    updateTimedBlock(section.id, {
      ...patch,
      resultSummary: `${r} round${r === 1 ? "" : "s"} + ${e} reps`,
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-bold">{section.minutes} MIN AMRAP</h3>
        {section.isBenchmark && (
          <span className="label rounded-md bg-volt/15 px-2 py-1 text-volt">BENCHMARK</span>
        )}
      </div>

      {section.isBenchmark && section.benchmarkLabel && (
        <p className="rounded-xl border border-volt/40 bg-volt/5 px-3 py-2 text-sm font-semibold text-volt">
          {section.benchmarkLabel}
        </p>
      )}

      {/* spec §13: ONE weight for all KB movements in the block */}
      <BlockWeightBanner kg={section.blockWeightKg} label="ALL KB MOVEMENTS" />

      <div className="space-y-2">
        <p className="label">ONE ROUND</p>
        {section.round.map((m) => {
          const ex = getExercise(m.exerciseId);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <div>
                <p className="font-semibold">{m.displayName ?? ex.name}</p>
                <p className="text-sm text-mid tnum">{movementLabel(m)}</p>
              </div>
              <GripBadge grip={m.grip} gripNotes={m.gripNotes} />
            </div>
          );
        })}
        <Disclosure label="WATCH FOR" accent>
          <CueList items={section.round.flatMap((m) => m.watchFor ?? getExercise(m.exerciseId).watchFor)} />
        </Disclosure>
      </div>

      {!readOnly && (
        <TimerBar
          timer={result.timer}
          totalSec={section.minutes * 60}
          onPatch={(patch) => updateTimer(section.id, "timedBlock", patch)}
          onFinished={() => updateTimedBlock(section.id, { completed: true })}
        />
      )}

      {/* result entry (spec: complete rounds, extra reps, total result, notes, perceived difficulty) */}
      <div className="space-y-3 rounded-xl border border-line bg-raised p-3">
        <p className="label">RESULT</p>
        {readOnly ? (
          <p className="font-display text-3xl font-bold text-volt">{result.resultSummary ?? "—"}</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="label">Complete rounds</span>
              <Stepper label="Complete rounds" value={rounds} onChange={(v) => setResult({ completedRounds: v, completed: true })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="label">Extra reps</span>
              <Stepper label="Extra reps" value={extra} onChange={(v) => setResult({ extraReps: v, completed: true })} />
            </div>
            <p className="text-center font-display text-3xl font-bold text-volt" aria-live="polite">
              {summary}
            </p>
            <div>
              <span className="label">Perceived difficulty</span>
              <div className="mt-1 flex gap-1.5" role="group" aria-label="Perceived difficulty 1 to 5">
                {([1, 2, 3, 4, 5] as Difficulty1to5[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      updateTimedBlock(section.id, {
                        perceivedDifficulty: result.perceivedDifficulty === n ? undefined : n,
                      })
                    }
                    aria-pressed={result.perceivedDifficulty === n}
                    className={cls(
                      "h-11 flex-1 rounded-lg border font-display text-lg font-bold active:scale-[0.95]",
                      result.perceivedDifficulty === n
                        ? "border-volt bg-volt text-onvolt"
                        : "border-line bg-surface text-mid",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {readOnly && result.perceivedDifficulty && (
          <p className="text-sm text-mid">Perceived difficulty: {result.perceivedDifficulty}/5</p>
        )}
      </div>

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
