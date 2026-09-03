"use client";

import type {
  Difficulty1to5,
  SetResult,
  SetsPrescription,
  SkillPracticeSection,
  SkillResult,
  TimedBlockResult,
  TimedSection,
  WarmupResult,
  WorkoutDifficulty,
  WorkoutFeedback,
  WorkoutSession,
} from "@/lib/types";
import { makeOrUpdateNote, patchCompletedSession } from "@/lib/session/store";
import { EXERCISES_BY_ID } from "@/lib/seed/exercises";
import { getSkillVariation } from "@/lib/seed/skills";
import { CheckCircle, Stepper } from "@/components/ui";
import { NoteField } from "@/components/NoteField";
import { prescriptionLabel, defaultReps } from "./format";
import { cls } from "@/lib/util";

// ---------------------------------------------------------------------------
// Correction tool for an already-finished session (spec §31 edit mode). Reads
// the LIVE session passed by the parent each render and writes every change
// immediately through patchCompletedSession — which stamps editedAt and syncs.
// The prescription snapshot is NEVER touched; only results/feedback/notes.
// ---------------------------------------------------------------------------

const DIFFICULTIES: Array<{ value: WorkoutDifficulty; emoji: string; label: string }> = [
  { value: "TOO_EASY", emoji: "😴", label: "Too easy" },
  { value: "RIGHT", emoji: "👍", label: "Right" },
  { value: "HARD", emoji: "🔥", label: "Hard" },
  { value: "TOO_HARD", emoji: "☠️", label: "Too hard" },
];

// -------------------- draft mutation helpers (target completed session) ------

function findSet(
  s: WorkoutSession,
  sectionId: string,
  prescriptionId: string,
  setIndex: number,
): SetResult | undefined {
  return s.sections
    .find((x) => x.sectionId === sectionId)
    ?.exercises?.find((e) => e.prescriptionId === prescriptionId)?.sets[setIndex];
}

function patchSet(
  id: string,
  sectionId: string,
  prescriptionId: string,
  setIndex: number,
  patch: Partial<SetResult>,
): void {
  patchCompletedSession(id, (d) => {
    const set = findSet(d, sectionId, prescriptionId, setIndex);
    if (set) Object.assign(set, patch);
  });
}

function patchSetNote(
  id: string,
  sectionId: string,
  prescriptionId: string,
  setIndex: number,
  text: string,
): void {
  patchCompletedSession(id, (d) => {
    const set = findSet(d, sectionId, prescriptionId, setIndex);
    if (set) set.note = makeOrUpdateNote(set.note, text);
  });
}

function patchExerciseNote(id: string, sectionId: string, prescriptionId: string, text: string): void {
  patchCompletedSession(id, (d) => {
    const ex = d.sections
      .find((x) => x.sectionId === sectionId)
      ?.exercises?.find((e) => e.prescriptionId === prescriptionId);
    if (ex) ex.note = makeOrUpdateNote(ex.note, text);
  });
}

function patchTimedBlock(id: string, sectionId: string, patch: Partial<TimedBlockResult>): void {
  patchCompletedSession(id, (d) => {
    const b = d.sections.find((x) => x.sectionId === sectionId)?.timedBlock;
    if (b) Object.assign(b, patch);
  });
}

function patchTimedBlockNote(id: string, sectionId: string, text: string): void {
  patchCompletedSession(id, (d) => {
    const b = d.sections.find((x) => x.sectionId === sectionId)?.timedBlock;
    if (b) b.note = makeOrUpdateNote(b.note, text);
  });
}

function patchSkill(id: string, sectionId: string, patch: Partial<SkillResult>): void {
  patchCompletedSession(id, (d) => {
    const sk = d.sections.find((x) => x.sectionId === sectionId)?.skill;
    if (sk) Object.assign(sk, patch);
  });
}

function patchSkillNote(id: string, sectionId: string, text: string): void {
  patchCompletedSession(id, (d) => {
    const sk = d.sections.find((x) => x.sectionId === sectionId)?.skill;
    if (sk) sk.note = makeOrUpdateNote(sk.note, text);
  });
}

function patchSkillPracticeSet(
  id: string,
  sectionId: string,
  setIndex: number,
  patch: Partial<SetResult>,
): void {
  patchCompletedSession(id, (d) => {
    const set = d.sections.find((x) => x.sectionId === sectionId)?.skillPractice?.sets[setIndex];
    if (set) Object.assign(set, patch);
  });
}

function patchSkillPracticeSetNote(id: string, sectionId: string, setIndex: number, text: string): void {
  patchCompletedSession(id, (d) => {
    const set = d.sections.find((x) => x.sectionId === sectionId)?.skillPractice?.sets[setIndex];
    if (set) set.note = makeOrUpdateNote(set.note, text);
  });
}

function patchSkillPracticeNote(id: string, sectionId: string, text: string): void {
  patchCompletedSession(id, (d) => {
    const sp = d.sections.find((x) => x.sectionId === sectionId)?.skillPractice;
    if (sp) sp.note = makeOrUpdateNote(sp.note, text);
  });
}

function patchWarmup(id: string, sectionId: string, patch: Partial<WarmupResult>): void {
  patchCompletedSession(id, (d) => {
    const w = d.sections.find((x) => x.sectionId === sectionId)?.warmup;
    if (w) Object.assign(w, patch);
  });
}

function patchWarmupNote(id: string, sectionId: string, text: string): void {
  patchCompletedSession(id, (d) => {
    const w = d.sections.find((x) => x.sectionId === sectionId)?.warmup;
    if (w) w.note = makeOrUpdateNote(w.note, text);
  });
}

function patchFeedback(id: string, mutate: (f: WorkoutFeedback) => void): void {
  patchCompletedSession(id, (d) => {
    if (!d.feedback) d.feedback = { difficulty: "RIGHT", pain: false };
    mutate(d.feedback);
  });
}

function patchWorkoutNote(id: string, text: string): void {
  patchCompletedSession(id, (d) => {
    d.workoutNote = makeOrUpdateNote(d.workoutNote, text);
  });
}

// -------------------- small shared controls ----------------------------------

function LabeledStepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  ariaLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label">{label}</span>
      <Stepper label={ariaLabel} value={value} onChange={onChange} min={min} max={max} step={step} suffix={suffix} />
    </div>
  );
}

/** 1–5 segmented row; tap the active value again to clear it (→ undefined). */
function ScaleRow({
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

// -------------------- per-section editors ------------------------------------

function SetEditor({
  id,
  sectionId,
  prescription: p,
  set,
  setIndex,
  label,
}: {
  id: string;
  sectionId: string;
  prescription: SetsPrescription;
  set: SetResult;
  setIndex: number;
  label: string;
}) {
  const write = (patch: Partial<SetResult>) => patchSet(id, sectionId, p.id, setIndex, patch);
  return (
    <div className="border-t border-line py-2 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <CheckCircle checked={set.completed} onToggle={() => write({ completed: !set.completed })} label={`${label} completed`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {p.durationSec ? (
          <LabeledStepper
            label="Sec"
            ariaLabel={`${label} seconds`}
            value={set.actualDurationSec ?? p.durationSec}
            step={5}
            suffix="s"
            onChange={(v) => write({ actualDurationSec: v })}
          />
        ) : p.perSide ? (
          <>
            <LabeledStepper
              label="L"
              ariaLabel={`${label} reps left`}
              value={set.actualRepsLeft ?? defaultReps(p.reps)}
              onChange={(v) => write({ actualRepsLeft: v })}
            />
            <LabeledStepper
              label="R"
              ariaLabel={`${label} reps right`}
              value={set.actualRepsRight ?? defaultReps(p.reps)}
              onChange={(v) => write({ actualRepsRight: v })}
            />
          </>
        ) : (
          <LabeledStepper
            label="Reps"
            ariaLabel={`${label} reps`}
            value={set.actualReps ?? defaultReps(p.reps)}
            onChange={(v) => write({ actualReps: v })}
          />
        )}
      </div>
      <NoteField note={set.note} onSave={(t) => patchSetNote(id, sectionId, p.id, setIndex, t)} placeholder="Add set note…" />
    </div>
  );
}

function SetsSectionEditor({
  id,
  sectionId,
  prescriptions,
  session,
  rounds,
}: {
  id: string;
  sectionId: string;
  prescriptions: SetsPrescription[];
  session: WorkoutSession;
  rounds?: number;
}) {
  const result = session.sections.find((x) => x.sectionId === sectionId);
  return (
    <>
      {prescriptions.map((p) => {
        const ex = result?.exercises?.find((e) => e.prescriptionId === p.id);
        if (!ex) return null;
        const name = EXERCISES_BY_ID[p.exerciseId]?.name ?? p.displayName ?? p.exerciseId;
        return (
          <div key={p.id} className="rounded-xl border border-line bg-raised p-3">
            <p className="font-display text-lg font-bold leading-tight">{name}</p>
            <p className="text-sm text-low tnum">{prescriptionLabel(p)}</p>
            <div className="mt-2">
              {ex.sets.map((set, i) => (
                <SetEditor
                  key={i}
                  id={id}
                  sectionId={sectionId}
                  prescription={p}
                  set={set}
                  setIndex={i}
                  label={rounds !== undefined ? `ROUND ${i + 1}` : `SET ${i + 1}`}
                />
              ))}
            </div>
            <div className="mt-1 border-t border-line pt-1">
              <NoteField note={ex.note} onSave={(t) => patchExerciseNote(id, sectionId, p.id, t)} placeholder="Add exercise note…" />
            </div>
          </div>
        );
      })}
    </>
  );
}

function TimedBlockEditor({
  id,
  section,
  block,
}: {
  id: string;
  section: TimedSection;
  block: TimedBlockResult;
}) {
  const write = (patch: Partial<TimedBlockResult>) => patchTimedBlock(id, section.id, patch);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {section.type === "EMOM" && (
          <LabeledStepper
            label="Minutes done"
            ariaLabel="Completed minutes"
            value={block.completedMinutes ?? 0}
            max={section.minutes}
            onChange={(v) => write({ completedMinutes: v })}
          />
        )}
        {(section.type === "AMRAP" || section.type === "FLOW") && (
          <LabeledStepper
            label="Rounds"
            ariaLabel="Completed rounds"
            value={block.completedRounds ?? 0}
            max={section.type === "FLOW" ? section.rounds : undefined}
            onChange={(v) => write({ completedRounds: v })}
          />
        )}
        {section.type === "AMRAP" && (
          <LabeledStepper
            label="Extra reps"
            ariaLabel="Extra reps"
            value={block.extraReps ?? 0}
            onChange={(v) => write({ extraReps: v })}
          />
        )}
      </div>
      <ScaleRow
        label="PERCEIVED DIFFICULTY"
        value={block.perceivedDifficulty}
        onChange={(v) => write({ perceivedDifficulty: v })}
      />
      <NoteField note={block.note} onSave={(t) => patchTimedBlockNote(id, section.id, t)} placeholder="Add block note…" />
    </div>
  );
}

function SkillEditor({ id, sectionId, skill }: { id: string; sectionId: string; skill: SkillResult }) {
  const write = (patch: Partial<SkillResult>) => patchSkill(id, sectionId, patch);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="label">COMPLETED</span>
        <CheckCircle checked={skill.completed} onToggle={() => write({ completed: !skill.completed })} label="Skill completed" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <LabeledStepper
          label="Duration (min)"
          ariaLabel="Actual duration minutes"
          value={skill.actualDurationMin ?? 0}
          onChange={(v) => write({ actualDurationMin: v })}
        />
        <LabeledStepper
          label="Best hold"
          ariaLabel="Best hold seconds"
          value={skill.bestHoldSec ?? 0}
          step={5}
          suffix="s"
          onChange={(v) => write({ bestHoldSec: v })}
        />
      </div>
      <NoteField note={skill.note} onSave={(t) => patchSkillNote(id, sectionId, t)} placeholder="Add skill note…" />
    </div>
  );
}

function SkillPracticeEditor({
  id,
  section,
  session,
}: {
  id: string;
  section: SkillPracticeSection;
  session: WorkoutSession;
}) {
  const result = session.sections.find((x) => x.sectionId === section.id)?.skillPractice;
  if (!result) return null;
  const variation = getSkillVariation(section.familyId, result.selectedVariationId);
  const isHold = variation?.prescriptionType === "HOLD_SEC";
  return (
    <div>
      <p className="text-sm text-mid">{variation?.name ?? section.familyId}</p>
      <div className="mt-2">
        {result.sets.map((set, i) => (
          <div key={i} className="border-t border-line py-2 first:border-t-0">
            <div className="flex items-center justify-between">
              <span className="label">SET {i + 1}</span>
              <CheckCircle
                checked={set.completed}
                onToggle={() => patchSkillPracticeSet(id, section.id, i, { completed: !set.completed })}
                label={`Set ${i + 1} completed`}
              />
            </div>
            <div className="mt-2">
              {isHold ? (
                <LabeledStepper
                  label="Sec"
                  ariaLabel={`Set ${i + 1} seconds`}
                  value={set.actualDurationSec ?? variation?.defaultPrescription.holdSec ?? 0}
                  step={5}
                  suffix="s"
                  onChange={(v) => patchSkillPracticeSet(id, section.id, i, { actualDurationSec: v })}
                />
              ) : (
                <LabeledStepper
                  label="Reps"
                  ariaLabel={`Set ${i + 1} reps`}
                  value={set.actualReps ?? variation?.defaultPrescription.reps ?? 0}
                  onChange={(v) => patchSkillPracticeSet(id, section.id, i, { actualReps: v })}
                />
              )}
            </div>
            <NoteField note={set.note} onSave={(t) => patchSkillPracticeSetNote(id, section.id, i, t)} placeholder="Add set note…" />
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-line pt-1">
        <NoteField note={result.note} onSave={(t) => patchSkillPracticeNote(id, section.id, t)} placeholder="Add practice note…" />
      </div>
    </div>
  );
}

function WarmupEditor({ id, sectionId, warmup }: { id: string; sectionId: string; warmup: WarmupResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">COMPLETED</span>
        <CheckCircle checked={warmup.completed} onToggle={() => patchWarmup(id, sectionId, { completed: !warmup.completed })} label="Warm-up completed" />
      </div>
      <NoteField note={warmup.note} onSave={(t) => patchWarmupNote(id, sectionId, t)} placeholder="Add warm-up note…" />
    </div>
  );
}

function IntervalEditor({ id, sectionId, session }: { id: string; sectionId: string; session: WorkoutSession }) {
  const er = session.sections.find((x) => x.sectionId === sectionId)?.exercises?.[0];
  if (!er) return null;
  return (
    <div>
      <div className="mt-1">
        {er.sets.map((set, i) => (
          <div key={i} className="border-t border-line py-2 first:border-t-0">
            <div className="flex items-center justify-between">
              <span className="label">ROUND {i + 1}</span>
              <CheckCircle
                checked={set.completed}
                onToggle={() => patchSet(id, sectionId, er.prescriptionId, i, { completed: !set.completed })}
                label={`Round ${i + 1} completed`}
              />
            </div>
            <NoteField note={set.note} onSave={(t) => patchSetNote(id, sectionId, er.prescriptionId, i, t)} placeholder="Add round note…" />
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-line pt-1">
        <NoteField note={er.note} onSave={(t) => patchExerciseNote(id, sectionId, er.prescriptionId, t)} placeholder="Add note…" />
      </div>
    </div>
  );
}

function SectionEditor({ id, session, sectionId }: { id: string; session: WorkoutSession; sectionId: string }) {
  const section = session.snapshot.sections.find((s) => s.id === sectionId);
  const result = session.sections.find((r) => r.sectionId === sectionId);
  if (!section || !result) return null;

  switch (section.type) {
    case "STRAIGHT_SETS":
      return <SetsSectionEditor id={id} sectionId={section.id} prescriptions={section.prescriptions} session={session} />;
    case "CIRCUIT":
      return (
        <SetsSectionEditor
          id={id}
          sectionId={section.id}
          prescriptions={section.prescriptions}
          session={session}
          rounds={section.rounds}
        />
      );
    case "EMOM":
    case "AMRAP":
    case "FLOW":
      return result.timedBlock ? <TimedBlockEditor id={id} section={section} block={result.timedBlock} /> : null;
    case "SKILL":
      return result.skill ? <SkillEditor id={id} sectionId={section.id} skill={result.skill} /> : null;
    case "SKILL_PRACTICE":
      return <SkillPracticeEditor id={id} section={section} session={session} />;
    case "WARMUP":
      return result.warmup ? <WarmupEditor id={id} sectionId={section.id} warmup={result.warmup} /> : null;
    case "INTERVAL":
      return <IntervalEditor id={id} sectionId={section.id} session={session} />;
  }
}

// -------------------- main overlay -------------------------------------------

export function EditSessionForm({ session, onClose }: { session: WorkoutSession; onClose: () => void }) {
  const id = session.id;
  const f = session.feedback;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Edit workout">
      <div className="flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border-t border-line bg-raised">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-2xl font-bold">EDIT WORKOUT</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.95]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-xs text-low">All changes save automatically. The prescription is never changed.</p>

          {session.snapshot.sections.map((s) => {
            if (!session.sections.some((r) => r.sectionId === s.id)) return null;
            return (
              <section key={s.id} className="rounded-2xl border border-line bg-surface p-3">
                <h3 className="mb-2 font-display text-lg font-bold leading-tight">{s.title}</h3>
                <SectionEditor id={id} session={session} sectionId={s.id} />
              </section>
            );
          })}

          {/* Session feedback */}
          <section className="rounded-2xl border border-volt/30 bg-surface p-3">
            <h3 className="mb-3 font-display text-lg font-bold">SESSION FEEDBACK</h3>

            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => {
                const active = f?.difficulty === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patchFeedback(id, (fb) => { fb.difficulty = d.value; })}
                    className={cls(
                      "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 active:scale-[0.96]",
                      active ? "border-volt bg-volt/10" : "border-line bg-surface",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {d.emoji}
                    </span>
                    <span className={cls("text-xs font-semibold", active ? "text-volt" : "text-mid")}>{d.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-4">
              <ScaleRow label="ENERGY" value={f?.energy} onChange={(v) => patchFeedback(id, (fb) => { fb.energy = v; })} />
              <ScaleRow label="SORENESS BEFORE" value={f?.sorenessBefore} onChange={(v) => patchFeedback(id, (fb) => { fb.sorenessBefore = v; })} />
              <ScaleRow label="SORENESS AFTER" value={f?.sorenessAfter} onChange={(v) => patchFeedback(id, (fb) => { fb.sorenessAfter = v; })} />

              <div>
                <p className="label mb-1">PAIN / DISCOMFORT?</p>
                <div className="flex gap-2" role="group" aria-label="Pain or discomfort">
                  {[false, true].map((v) => {
                    const active = (f?.pain ?? false) === v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        aria-pressed={active}
                        onClick={() => patchFeedback(id, (fb) => { fb.pain = v; if (!v) fb.painNote = undefined; })}
                        className={cls(
                          "h-11 flex-1 rounded-lg border font-semibold active:scale-[0.97]",
                          active
                            ? v
                              ? "border-danger bg-danger/15 text-danger"
                              : "border-volt bg-volt text-onvolt"
                            : "border-line bg-surface text-mid",
                        )}
                      >
                        {v ? "Yes" : "No"}
                      </button>
                    );
                  })}
                </div>
                {f?.pain && (
                  <textarea
                    value={f.painNote ?? ""}
                    onChange={(e) => patchFeedback(id, (fb) => { fb.painNote = e.target.value; })}
                    placeholder="Where / what kind of pain?"
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-danger/40 bg-surface p-3 text-base text-hi placeholder:text-low"
                  />
                )}
              </div>

              <div>
                <p className="label mb-1">WORKOUT NOTES</p>
                <NoteField note={session.workoutNote} onSave={(t) => patchWorkoutNote(id, t)} placeholder="Anything worth remembering…" />
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-line p-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}>
          <button
            type="button"
            onClick={onClose}
            className="h-14 w-full rounded-xl bg-volt font-display text-xl font-bold tracking-wide text-onvolt active:scale-[0.98]"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
