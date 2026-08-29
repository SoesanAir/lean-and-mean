"use client";

import type { FlowSection, TimedBlockResult } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { BlockWeightBanner, CheckCircle, CueList, Disclosure, GripBadge } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { setCycleNote, setTimedBlockNote, updateCycle } from "@/lib/session/store";
import { movementLabel } from "./format";

/** Core flow (Day 2): track each movement in each round, one weight for the whole flow. */
export function FlowCard({
  section,
  result,
  readOnly,
}: {
  section: FlowSection;
  result: TimedBlockResult;
  readOnly?: boolean;
}) {
  const perRound = section.movements.length;
  const done = result.cycles.filter((c) => c.completed).length;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-bold">
          {section.rounds} ROUNDS
        </h3>
        <span className="label">
          {done}/{result.cycles.length}
        </span>
      </div>

      <BlockWeightBanner kg={section.blockWeightKg} label="ENTIRE FLOW" />
      {section.intro && <p className="text-sm text-mid">{section.intro}</p>}

      {/* movement reference with grips + cues */}
      <div className="space-y-2">
        {section.movements.map((m) => {
          const ex = getExercise(m.exerciseId);
          return (
            <div key={m.id} className="rounded-xl border border-line px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.displayName ?? ex.name}</p>
                  <p className="text-sm text-mid tnum">{movementLabel(m)}</p>
                </div>
                <GripBadge grip={m.grip} gripNotes={m.gripNotes} />
              </div>
              <Disclosure label="WATCH FOR" accent>
                <CueList items={m.watchFor ?? ex.watchFor} />
              </Disclosure>
            </div>
          );
        })}
      </div>

      {/* per-round, per-movement tracking */}
      {Array.from({ length: section.rounds }, (_, r) => (
        <div key={r} className="rounded-xl border border-line bg-raised p-3">
          <p className="label mb-1">ROUND {r + 1}</p>
          {result.cycles.slice(r * perRound, (r + 1) * perRound).map((c) => (
            <div key={c.index} className="border-t border-line py-2 first:border-t-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.label.replace(`ROUND ${r + 1} — `, "")}</span>
                {readOnly ? (
                  <span className={c.completed ? "text-volt" : "text-low"}>{c.completed ? "done" : "—"}</span>
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
                <NoteField compact note={c.note} onSave={(t) => setCycleNote(section.id, c.index, t)} placeholder="Add note…" />
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="border-t border-line pt-1">
        {readOnly ? (
          result.note?.text && <p className="text-sm italic text-mid">“{result.note.text}”</p>
        ) : (
          <NoteField note={result.note} onSave={(t) => setTimedBlockNote(section.id, t)} placeholder="Add section note…" />
        )}
      </div>
    </div>
  );
}
