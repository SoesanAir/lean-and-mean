"use client";

import { useState } from "react";
import type { Difficulty1to5, WorkoutDifficulty } from "@/lib/types";
import { finishWorkout } from "@/lib/session/store";
import { cls } from "@/lib/util";

const DIFFICULTIES: Array<{ value: WorkoutDifficulty; emoji: string; label: string }> = [
  { value: "TOO_EASY", emoji: "😴", label: "Too easy" },
  { value: "RIGHT", emoji: "👍", label: "Right" },
  { value: "HARD", emoji: "🔥", label: "Hard" },
  { value: "TOO_HARD", emoji: "☠️", label: "Too hard" },
];

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Difficulty1to5;
  onChange: (v: Difficulty1to5 | undefined) => void;
}) {
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <div className="flex gap-1.5" role="group" aria-label={`${label} 1 to 5`}>
        {([1, 2, 3, 4, 5] as Difficulty1to5[]).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className={cls(
              "h-11 flex-1 rounded-lg border font-display text-lg font-bold active:scale-[0.95]",
              value === n ? "border-volt bg-volt text-onvolt" : "border-line bg-surface text-mid",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** End-of-workout feedback (spec §17) → FINISH persists permanently. */
export function FinishSheet({ onClose, onFinished }: { onClose: () => void; onFinished: () => void }) {
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty | null>(null);
  const [energy, setEnergy] = useState<Difficulty1to5 | undefined>();
  const [sorenessBefore, setSorenessBefore] = useState<Difficulty1to5 | undefined>();
  const [sorenessAfter, setSorenessAfter] = useState<Difficulty1to5 | undefined>();
  const [pain, setPain] = useState(false);
  const [painNote, setPainNote] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Finish workout">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-line bg-raised p-5 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">HOW HARD WAS THIS?</h2>
          <button type="button" onClick={onClose} aria-label="Cancel" className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.95]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={difficulty === d.value}
              onClick={() => setDifficulty(d.value)}
              className={cls(
                "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 active:scale-[0.96]",
                difficulty === d.value ? "border-volt bg-volt/10" : "border-line bg-surface",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {d.emoji}
              </span>
              <span className={cls("text-xs font-semibold", difficulty === d.value ? "text-volt" : "text-mid")}>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <Scale label="ENERGY" value={energy} onChange={setEnergy} />
          <Scale label="SORENESS BEFORE WORKOUT" value={sorenessBefore} onChange={setSorenessBefore} />
          <Scale label="SORENESS AFTER WORKOUT" value={sorenessAfter} onChange={setSorenessAfter} />

          <div>
            <p className="label mb-1">PAIN / DISCOMFORT?</p>
            <div className="flex gap-2" role="group" aria-label="Pain or discomfort">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={pain === v}
                  onClick={() => setPain(v)}
                  className={cls(
                    "h-11 flex-1 rounded-lg border font-semibold active:scale-[0.97]",
                    pain === v
                      ? v
                        ? "border-danger bg-danger/15 text-danger"
                        : "border-volt bg-volt text-onvolt"
                      : "border-line bg-surface text-mid",
                  )}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {pain && (
              <textarea
                value={painNote}
                onChange={(e) => setPainNote(e.target.value)}
                placeholder="Where / what kind of pain?"
                rows={2}
                className="mt-2 w-full rounded-lg border border-danger/40 bg-surface p-3 text-base text-hi placeholder:text-low"
              />
            )}
          </div>

          <div>
            <label htmlFor="workout-notes" className="label mb-1 block">
              GENERAL WORKOUT NOTES
            </label>
            <textarea
              id="workout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering…"
              rows={3}
              className="w-full rounded-lg border border-line bg-surface p-3 text-base text-hi placeholder:text-low"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!difficulty}
          onClick={() => {
            if (!difficulty) return;
            finishWorkout(
              { difficulty, energy, sorenessBefore, sorenessAfter, pain, painNote: pain ? painNote : undefined },
              notes,
            );
            onFinished();
          }}
          className="mt-6 h-14 w-full rounded-xl bg-volt font-display text-xl font-bold tracking-wide text-onvolt active:scale-[0.98] disabled:opacity-40"
        >
          FINISH WORKOUT
        </button>
        {!difficulty && <p className="mt-2 text-center text-xs text-low">Pick a difficulty to finish</p>}
      </div>
    </div>
  );
}
