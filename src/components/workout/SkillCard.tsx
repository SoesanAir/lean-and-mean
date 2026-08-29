"use client";

import type { SkillResult, SkillSection } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { CheckCircle, CueList, Disclosure, EmphasisBadge, GripBadge, Stepper } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { setSkillNote, updateSkill, updateTimer } from "@/lib/session/store";
import { elapsedSec } from "@/lib/session/timer";
import { TimerBar } from "./TimerBar";

/** Skill work (spec §6): duration, best attempt, completion, free-text. */
export function SkillCard({
  section,
  result,
  readOnly,
}: {
  section: SkillSection;
  result: SkillResult;
  readOnly?: boolean;
}) {
  const exercise = getExercise(section.exerciseId);

  if (readOnly) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <SkillHeader section={section} />
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="Completed" value={result.completed ? "Yes" : "No"} />
          <Row label="Duration" value={result.actualDurationMin !== undefined ? `${result.actualDurationMin} min` : "—"} />
          {section.trackBestHold && (
            <Row label="Best hold" value={result.bestHoldSec !== undefined ? `${result.bestHoldSec} sec` : "—"} />
          )}
          {section.trackAttempts && <Row label="Attempts" value={result.attempts !== undefined ? `${result.attempts}` : "—"} />}
        </dl>
        {result.note?.text && <p className="mt-2 text-sm italic text-mid">“{result.note.text}”</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <SkillHeader section={section} />

      <div className="mt-3">
        <TimerBar
          timer={result.timer}
          onPatch={(patch) => updateTimer(section.id, "skill", patch)}
          onFinished={() => {
            const mins = Math.round(elapsedSec(result.timer) / 60);
            updateSkill(section.id, {
              completed: true,
              actualDurationMin: result.actualDurationMin ?? Math.max(1, mins),
            });
          }}
        />
        <p className="mt-1 px-1 text-xs text-low">
          Target: {section.durationMin} min. Stop before technique deteriorates.
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <Disclosure label="WATCH FOR" accent>
          <CueList items={exercise.watchFor} />
        </Disclosure>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">Minutes practiced</span>
          <Stepper
            label="Minutes practiced"
            value={result.actualDurationMin ?? section.durationMin}
            onChange={(v) => updateSkill(section.id, { actualDurationMin: v })}
          />
        </div>
        {section.trackBestHold && (
          <div className="flex items-center justify-between">
            <span className="label">Best hold (sec)</span>
            <Stepper
              label="Best hold seconds"
              value={result.bestHoldSec ?? 0}
              step={1}
              onChange={(v) => updateSkill(section.id, { bestHoldSec: v })}
            />
          </div>
        )}
        {section.trackAttempts && (
          <div className="flex items-center justify-between">
            <span className="label">Attempts</span>
            <Stepper
              label="Attempts"
              value={result.attempts ?? 0}
              onChange={(v) => updateSkill(section.id, { attempts: v })}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="label">Practice complete</span>
          <CheckCircle
            checked={result.completed}
            onToggle={() =>
              updateSkill(section.id, {
                completed: !result.completed,
                actualDurationMin: result.actualDurationMin ?? section.durationMin,
              })
            }
            label="Skill practice complete"
          />
        </div>
      </div>

      <div className="mt-2 border-t border-line pt-1">
        <NoteField note={result.note} onSave={(t) => setSkillNote(section.id, t)} placeholder="Add skill note…" />
      </div>
    </div>
  );
}

function SkillHeader({ section }: { section: SkillSection }) {
  const exercise = getExercise(section.exerciseId);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-2xl font-bold leading-tight">{exercise.name} Practice</h3>
        <GripBadge grip={exercise.defaultGrip} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-display text-3xl font-bold text-volt tnum">{section.durationMin}</span>
        <span className="label">MIN</span>
        {section.emphasis && <EmphasisBadge emphasis={section.emphasis} />}
      </div>
      {section.intro && <p className="mt-1 text-sm text-mid">{section.intro}</p>}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-mid">{label}</dt>
      <dd className="tnum text-hi">{value}</dd>
    </div>
  );
}
