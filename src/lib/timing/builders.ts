// TimerPlan builders: sections → executable phase plans. The plan is derived
// from the SAME structured section data the cards display, so the readable
// description and the machine plan can never disagree.
// Rule: if the generator prescribes time, the player understands it here.

import type {
  AmrapSection,
  EmomSection,
  IntervalSection,
  SkillPracticeSection,
  SkillPrescription,
  WarmupSection,
  WorkoutSection,
} from "../types";
import { EXERCISES_BY_ID } from "../seed/exercises";
import { getSkillVariation } from "../seed/skills";
import { WARMUP_MOVEMENTS_BY_ID } from "../seed/warmups";
import { countdownPhase, sanitizePhases, type TimerPlan } from "./engine";
import { movementLabel } from "../../components/workout/format";

const DEFAULT_HOLD_REST_SEC = 45;

export function emomPlan(section: EmomSection): TimerPlan {
  const intervalSec = section.intervalSec ?? 60;
  const rounds = Math.floor((section.minutes * 60) / intervalSec);
  const phases = [countdownPhase()];
  for (let i = 0; i < rounds; i++) {
    const m = section.pattern[i % section.pattern.length];
    const name = m.displayName ?? EXERCISES_BY_ID[m.exerciseId]?.name ?? m.exerciseId;
    phases.push({
      id: `${section.id}-m${i}`,
      kind: "WORK" as const,
      label: name,
      detail: [
        `${movementLabel(m)} reps`,
        section.blockWeightKg !== null && !m.bodyweight ? `${section.blockWeightKg} kg` : null,
        `grip ${m.grip.replace(/_/g, "-")}`,
      ]
        .filter(Boolean)
        .join(" · "),
      durationSec: intervalSec,
      round: i + 1,
      totalRounds: rounds,
      roundWord: intervalSec === 60 ? "Minute" : "Interval",
      exerciseId: m.exerciseId,
    });
  }
  return { id: section.id, mode: "EMOM", phases: sanitizePhases(phases), endLabel: "DONE" };
}

export function amrapPlan(section: AmrapSection): TimerPlan {
  return {
    id: section.id,
    mode: "AMRAP",
    phases: sanitizePhases([
      countdownPhase(),
      {
        id: `${section.id}-amrap`,
        kind: "WORK",
        label: `${section.minutes} MIN AMRAP`,
        detail: section.round
          .map((m) => `${movementLabel(m)} ${m.displayName ?? EXERCISES_BY_ID[m.exerciseId]?.name ?? m.exerciseId}`)
          .join(" · "),
        durationSec: section.minutes * 60,
        warnAtSec: 10, // warning before the AMRAP ends; final cue is END, never GO
      },
    ]),
    endLabel: "TIME",
  };
}

export function intervalPlan(section: IntervalSection): TimerPlan {
  const name = EXERCISES_BY_ID[section.exerciseId]?.name ?? section.exerciseId;
  const phases = [countdownPhase()];
  for (let i = 0; i < section.rounds; i++) {
    phases.push({
      id: `${section.id}-w${i}`,
      kind: "WORK" as const,
      label: name,
      durationSec: section.workSec,
      round: i + 1,
      totalRounds: section.rounds,
      roundWord: "Round",
      exerciseId: section.exerciseId,
    });
    if (i < section.rounds - 1) {
      phases.push({
        id: `${section.id}-r${i}`,
        kind: "REST" as const,
        label: "REST",
        durationSec: section.restSec,
        round: i + 1,
        totalRounds: section.rounds,
        roundWord: "Round",
      });
    }
  }
  return { id: section.id, mode: "INTERVAL", phases: sanitizePhases(phases), endLabel: "DONE" };
}

export function warmupPlan(section: WarmupSection): TimerPlan {
  const phases = [countdownPhase(true)];
  section.movements.forEach((m, i) => {
    const def = WARMUP_MOVEMENTS_BY_ID[m.movementId];
    phases.push({
      id: `${section.id}-mv${i}`,
      kind: "WORK" as const,
      label: def?.name ?? m.movementId,
      detail: def?.shortCue,
      durationSec: m.durationSeconds,
      round: i + 1,
      totalRounds: section.movements.length,
      roundWord: "Movement",
      soft: true, // lighter cues than an EMOM alarm
    });
  });
  return { id: section.id, mode: "WARMUP", phases: sanitizePhases(phases), endLabel: "DONE" };
}

/** guided hold timer for timed skill practice: hold / rest × sets */
export function holdsPlan(
  section: SkillPracticeSection,
  selectedVariationId: string,
): TimerPlan | null {
  const variation = getSkillVariation(section.familyId, selectedVariationId);
  const p: SkillPrescription | undefined = variation?.defaultPrescription ?? section.prescription;
  if (!p?.holdSec) return null; // reps/attempt practice is manual — no plan
  const rest = p.restSec ?? DEFAULT_HOLD_REST_SEC;
  const phases = [countdownPhase()];
  for (let i = 0; i < p.sets; i++) {
    phases.push({
      id: `${section.id}-h${i}`,
      kind: "HOLD" as const,
      label: variation?.name ?? "Hold",
      detail: `${p.holdSec} sec hold${p.perSide ? " / side" : ""}`,
      durationSec: p.holdSec,
      round: i + 1,
      totalRounds: p.sets,
      roundWord: "Set",
    });
    if (i < p.sets - 1) {
      phases.push({
        id: `${section.id}-hr${i}`,
        kind: "REST" as const,
        label: "REST",
        durationSec: rest,
        round: i + 1,
        totalRounds: p.sets,
        roundWord: "Set",
      });
    }
  }
  return { id: section.id, mode: "HOLDS", phases: sanitizePhases(phases), endLabel: "DONE" };
}

/** For Time: stopwatch, optionally with a time cap (both clocks shown by the player) */
export function forTimePlan(id: string, label: string, capSec?: number): TimerPlan {
  return {
    id,
    mode: "FORTIME",
    phases: sanitizePhases([
      countdownPhase(),
      {
        id: `${id}-work`,
        kind: "WORK",
        label,
        durationSec: capSec ?? 0, // 0 = open-ended stopwatch
        warnAtSec: capSec ? 10 : undefined,
      },
    ]),
    endLabel: "TIME",
  };
}

/** plan for any section that carries structured timing (null = untimed/manual) */
export function planForSection(
  section: WorkoutSection,
  selectedVariationId?: string,
): TimerPlan | null {
  switch (section.type) {
    case "EMOM":
      return emomPlan(section);
    case "AMRAP":
      return amrapPlan(section);
    case "INTERVAL":
      return intervalPlan(section);
    case "WARMUP":
      return warmupPlan(section);
    case "SKILL_PRACTICE":
      return holdsPlan(section, selectedVariationId ?? section.variationId);
    default:
      return null; // straight sets use the set-rest timer; flows/skill legacy are manual
  }
}
