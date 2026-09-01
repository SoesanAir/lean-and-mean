"use client";

import type { IntervalSection, SectionResult, WorkoutSection } from "@/lib/types";
import { getExercise } from "@/lib/seed/exercises";
import { EmphasisBadge } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { setSectionNote, setSetNote, updateSectionTimer, updateSetResult } from "@/lib/session/store";
import { sectionProgress } from "@/lib/session/progress";
import { intervalPlan } from "@/lib/timing/builders";
import { cls } from "@/lib/util";
import { ExerciseCard } from "./ExerciseCard";
import { SkillCard } from "./SkillCard";
import { SkillPracticeCard } from "./SkillPracticeCard";
import { WarmupCard } from "./WarmupCard";
import { EmomCard } from "./EmomCard";
import { AmrapCard } from "./AmrapCard";
import { FlowCard } from "./FlowCard";
import { SetRow } from "./SetRow";
import { TimerPlanPlayer } from "./TimerPlanPlayer";

/** Accordion section: collapsed = title + progress; expanded = full content. */
export function SectionCard({
  index,
  section,
  result,
  open,
  onToggle,
  readOnly,
}: {
  index: number;
  section: WorkoutSection;
  result: SectionResult;
  open: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}) {
  const prog = sectionProgress(result);
  const complete = prog.total > 0 && prog.done === prog.total;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-raised"
      >
        <div className="flex items-center gap-3">
          <span
            className={cls(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-base font-bold",
              complete ? "bg-volt text-onvolt" : "border border-line text-mid",
            )}
          >
            {complete ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="section complete">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">{section.title}</h2>
            <p className="text-xs text-low tnum">
              {prog.done}/{prog.total} done
              {result.note?.text && <span className="ml-2 text-note">● note</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {section.emphasis && open && <EmphasisBadge emphasis={section.emphasis} />}
          <svg
            viewBox="0 0 24 24"
            className={cls("h-5 w-5 text-mid transition-transform duration-200", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-3">
          <SectionBody section={section} result={result} readOnly={readOnly} />
          <div className="px-1">
            {readOnly ? (
              result.note?.text && <p className="text-sm italic text-mid">“{result.note.text}”</p>
            ) : (
              <NoteField
                note={result.note}
                onSave={(t) => setSectionNote(section.id, t)}
                placeholder="Add section note…"
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionBody({
  section,
  result,
  readOnly,
}: {
  section: WorkoutSection;
  result: SectionResult;
  readOnly?: boolean;
}) {
  switch (section.type) {
    case "WARMUP":
      return result.warmup ? <WarmupCard section={section} result={result.warmup} readOnly={readOnly} /> : null;
    case "SKILL_PRACTICE":
      return result.skillPractice ? (
        <SkillPracticeCard section={section} result={result.skillPractice} readOnly={readOnly} />
      ) : null;
    case "SKILL":
      return result.skill ? <SkillCard section={section} result={result.skill} readOnly={readOnly} /> : null;
    case "EMOM":
      return result.timedBlock ? <EmomCard section={section} result={result.timedBlock} readOnly={readOnly} /> : null;
    case "AMRAP":
      return result.timedBlock ? <AmrapCard section={section} result={result.timedBlock} readOnly={readOnly} /> : null;
    case "FLOW":
      return result.timedBlock ? <FlowCard section={section} result={result.timedBlock} readOnly={readOnly} /> : null;
    case "STRAIGHT_SETS":
      return (
        <>
          {section.intro && <p className="px-1 text-sm text-mid">{section.intro}</p>}
          {section.prescriptions.map((p) => {
            const r = result.exercises?.find((e) => e.prescriptionId === p.id);
            return r ? (
              <ExerciseCard key={p.id} sectionId={section.id} prescription={p} result={r} readOnly={readOnly} />
            ) : null;
          })}
        </>
      );
    case "CIRCUIT":
      return (
        <>
          {section.intro && <p className="px-1 text-sm text-mid">{section.intro}</p>}
          {section.prescriptions.map((p) => {
            const r = result.exercises?.find((e) => e.prescriptionId === p.id);
            return r ? (
              <ExerciseCard
                key={p.id}
                sectionId={section.id}
                prescription={p}
                result={r}
                rounds={section.rounds}
                readOnly={readOnly}
              />
            ) : null;
          })}
        </>
      );
    case "INTERVAL":
      return <IntervalBody section={section} result={result} readOnly={readOnly} />;
  }
}

function IntervalBody({
  section,
  result,
  readOnly,
}: {
  section: IntervalSection;
  result: SectionResult;
  readOnly?: boolean;
}) {
  const ex = getExercise(section.exerciseId);
  const er = result.exercises?.[0];
  if (!er) return null;
  const prescription = {
    id: `${section.id}-rounds`,
    kind: "SETS" as const,
    exerciseId: section.exerciseId,
    grip: "NONE" as const,
    sets: section.rounds,
    durationSec: section.workSec,
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-display text-2xl font-bold">{ex.name}</h3>
      <p className="mt-1 text-lg font-semibold tnum">
        {section.rounds} × {section.workSec} sec <span className="text-mid">/ {section.restSec} sec rest</span>
      </p>
      {section.effort && <p className="text-sm text-med">{section.effort}</p>}
      {!readOnly && (
        <div className="mt-3">
          <TimerPlanPlayer
            plan={intervalPlan(section)}
            timer={result.sectionTimer ?? { status: "idle", elapsedBeforePauseMs: 0 }}
            onPatch={(p) => updateSectionTimer(section.id, p)}
            allowSkip
          />
        </div>
      )}
      <div className="mt-3">
        {er.sets.map((set, i) =>
          readOnly ? (
            <div key={i} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
              <span className="label">ROUND {i + 1}</span>
              <span className={set.completed ? "text-volt" : "text-low"}>{set.completed ? "done" : "—"}</span>
            </div>
          ) : (
            <SetRow
              key={i}
              label={`ROUND ${i + 1}`}
              prescription={prescription}
              set={set}
              onPatch={(patch) => updateSetResult(section.id, prescription.id, i, patch)}
              onNote={(text) => setSetNote(section.id, prescription.id, i, text)}
            />
          ),
        )}
      </div>
    </div>
  );
}
