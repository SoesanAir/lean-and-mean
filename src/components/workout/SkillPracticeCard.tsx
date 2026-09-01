"use client";

import { useState } from "react";
import type { SkillPracticeResult, SkillPracticeSection, SkillPrescription, SkillVariation } from "@/lib/types";
import { getSkillVariation, neighborVariation, SKILL_FAMILIES_BY_ID } from "@/lib/seed/skills";
import {
  scaleSkill,
  setSkillPracticeNote,
  setSkillSetNote,
  updateSkillPractice,
  updateSkillSet,
} from "@/lib/session/store";
import { CheckCircle, Stepper } from "@/components/ui";
import { InfoButton, InfoSheet, type MovementInfo } from "@/components/InfoSheet";
import { NoteField } from "@/components/NoteField";
import { cls } from "@/lib/util";

function variationInfo(v: SkillVariation): MovementInfo {
  return {
    name: v.name,
    shortCue: v.shortCue,
    instructions: v.instructions,
    tips: v.tips,
    stopWhen: v.stopWhen,
    videoUrl: v.videoUrl,
    youtubeQuery: v.name,
  };
}

function prescriptionLabel(p: SkillPrescription): string {
  if (p.holdSec) return `${p.sets} × ${p.holdSec} sec hold${p.perSide ? " / side" : ""}`;
  if (p.attempts) return `${p.sets > 1 ? `${p.sets} × ` : ""}${p.attempts} quality attempts`;
  if (p.reps) return `${p.sets} × ${p.reps}${p.perSide ? " / side" : ""}`;
  return `${p.sets} sets`;
}

/**
 * Skill practice card: family subtle, selected variation prominent, Scale
 * Down / Scale Up move exactly one level (disabled at the boundaries).
 * The originally prescribed variation stays untouched in the snapshot.
 */
export function SkillPracticeCard({
  section,
  result,
  readOnly,
}: {
  section: SkillPracticeSection;
  result: SkillPracticeResult;
  readOnly?: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);

  const family = SKILL_FAMILIES_BY_ID[section.familyId];
  const selected = getSkillVariation(section.familyId, result.selectedVariationId);
  const original = getSkillVariation(section.familyId, section.variationId);
  const prescription = selected?.defaultPrescription ?? section.prescription;
  const canDown = selected ? neighborVariation(section.familyId, selected.id, "down") !== null : false;
  const canUp = selected ? neighborVariation(section.familyId, selected.id, "up") !== null : false;

  if (!selected) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-mid">Unknown skill variation: {result.selectedVariationId}</p>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="label">{family?.name ?? section.familyId}</p>
        <h3 className="mt-0.5 font-display text-2xl font-bold leading-tight">{selected.name}</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-mid">Prescribed</dt>
            <dd className="text-hi">{original?.name ?? section.variationId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mid">Performed</dt>
            <dd className="text-hi">{selected.name}</dd>
          </div>
          {result.manualAdjustment && (
            <div className="flex justify-between">
              <dt className="text-mid">Adjustment</dt>
              <dd className="text-med">{result.manualAdjustment === "scaled_down" ? "Scaled down" : "Scaled up"}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-mid">Sets done</dt>
            <dd className="tnum text-hi">
              {result.sets.filter((s) => s.completed).length}/{result.sets.length}
            </dd>
          </div>
        </dl>
        {result.sets.filter((s) => s.note?.text).map((s) => (
          <p key={s.setIndex} className="mt-1 text-sm italic text-mid">
            Set {s.setIndex + 1}: “{s.note!.text}”
          </p>
        ))}
        {result.note?.text && <p className="mt-2 text-sm italic text-mid">“{result.note.text}”</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      {/* family subtle, variation prominent */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label">
            {family?.name ?? section.familyId} · LEVEL {selected.level}
          </p>
          <h3 className="font-display text-2xl font-bold leading-tight">{selected.name}</h3>
          <p className="mt-1 text-lg font-semibold text-volt">{prescriptionLabel(prescription)}</p>
          <p className="mt-0.5 text-sm text-mid">{selected.shortCue}</p>
        </div>
        <InfoButton onOpen={() => setInfoOpen(true)} label={selected.name} />
      </div>

      {result.manualAdjustment && (
        <p className="rounded-lg bg-med/10 px-3 py-1.5 text-xs font-semibold text-med">
          {result.manualAdjustment === "scaled_down" ? "Scaled down from" : "Scaled up from"}{" "}
          {original?.name ?? section.variationId}
        </p>
      )}

      {/* scale controls — reachable but secondary */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canDown}
          onClick={() => scaleSkill(section.id, "down")}
          className={cls(
            "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-mid active:scale-[0.97]",
            !canDown && "opacity-35",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          Scale Down
        </button>
        <button
          type="button"
          disabled={!canUp}
          onClick={() => scaleSkill(section.id, "up")}
          className={cls(
            "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-mid active:scale-[0.97]",
            !canUp && "opacity-35",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Scale Up
        </button>
      </div>

      {/* set logging */}
      <div>
        {result.sets.map((set, i) => (
          <div key={i} className="border-t border-line py-2 first:border-t-0">
            <div className="flex items-center justify-between gap-2">
              <span className="label">
                {prescription.attempts ? `ATTEMPT BLOCK ${i + 1}` : `SET ${i + 1}`}
              </span>
              <CheckCircle
                checked={set.completed}
                onToggle={() => {
                  const patch: Parameters<typeof updateSkillSet>[2] = { completed: !set.completed };
                  if (!set.completed) {
                    if (prescription.holdSec && set.actualDurationSec === undefined) {
                      patch.actualDurationSec = prescription.holdSec;
                    }
                    if (prescription.reps && set.actualReps === undefined) {
                      patch.actualReps = prescription.reps;
                    }
                    if (prescription.attempts && set.actualReps === undefined) {
                      patch.actualReps = prescription.attempts;
                    }
                  }
                  updateSkillSet(section.id, i, patch);
                }}
                label={`Set ${i + 1} complete`}
              />
            </div>
            {set.completed && (
              <div className="mt-2 flex items-center gap-2">
                <span className="label">
                  {prescription.holdSec ? "Seconds" : prescription.attempts ? "Attempts" : "Reps"}
                </span>
                {prescription.holdSec ? (
                  <Stepper
                    label={`Set ${i + 1} hold seconds`}
                    value={set.actualDurationSec ?? prescription.holdSec}
                    step={5}
                    suffix="s"
                    onChange={(v) => updateSkillSet(section.id, i, { actualDurationSec: v })}
                  />
                ) : (
                  <Stepper
                    label={`Set ${i + 1} count`}
                    value={set.actualReps ?? prescription.reps ?? prescription.attempts ?? 0}
                    onChange={(v) => updateSkillSet(section.id, i, { actualReps: v })}
                  />
                )}
              </div>
            )}
            <NoteField note={set.note} onSave={(t) => setSkillSetNote(section.id, i, t)} placeholder="Add set note…" />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => updateSkillPractice(section.id, { completed: !result.completed })}
        className={cls(
          "h-12 w-full rounded-xl border font-display text-base font-bold active:scale-[0.98]",
          result.completed ? "border-volt bg-volt/10 text-volt" : "border-line bg-raised text-hi",
        )}
      >
        {result.completed ? "PRACTICE COMPLETE ✓" : "MARK PRACTICE COMPLETE"}
      </button>

      <div className="border-t border-line pt-1">
        <NoteField note={result.note} onSave={(t) => setSkillPracticeNote(section.id, t)} placeholder="Add skill note…" />
      </div>

      {infoOpen && <InfoSheet info={variationInfo(selected)} onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
