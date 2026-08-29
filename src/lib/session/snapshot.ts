import type {
  DayTemplate,
  ExerciseResult,
  SectionResult,
  SetsPrescription,
  TimerState,
  WorkoutSection,
  WorkoutSession,
} from "../types";
import { EXERCISES_BY_ID } from "../seed/exercises";
import { nowISO, uid } from "../util";

const idleTimer = (): TimerState => ({ status: "idle", elapsedBeforePauseMs: 0 });

function emptyExerciseResult(p: SetsPrescription, totalSets: number): ExerciseResult {
  return {
    prescriptionId: p.id,
    sets: Array.from({ length: totalSets }, (_, i) => ({
      setIndex: i,
      completed: false,
    })),
  };
}

function emptySectionResult(section: WorkoutSection): SectionResult {
  switch (section.type) {
    case "SKILL":
      return {
        sectionId: section.id,
        skill: { completed: false, timer: idleTimer() },
      };
    case "STRAIGHT_SETS":
      return {
        sectionId: section.id,
        exercises: section.prescriptions.map((p) => emptyExerciseResult(p, p.sets)),
      };
    case "CIRCUIT":
      // one SetResult per round per prescription (rounds × sets-per-round)
      return {
        sectionId: section.id,
        exercises: section.prescriptions.map((p) =>
          emptyExerciseResult(p, p.sets * section.rounds),
        ),
      };
    case "INTERVAL":
      return {
        sectionId: section.id,
        exercises: [
          emptyExerciseResult(
            {
              id: `${section.id}-rounds`,
              kind: "SETS",
              exerciseId: section.exerciseId,
              grip: "NONE",
              sets: section.rounds,
              durationSec: section.workSec,
            },
            section.rounds,
          ),
        ],
      };
    case "EMOM":
      return {
        sectionId: section.id,
        timedBlock: {
          completed: false,
          timer: idleTimer(),
          cycles: Array.from({ length: section.minutes }, (_, i) => {
            const movement = section.pattern[i % section.pattern.length];
            const name =
              movement.displayName ?? EXERCISES_BY_ID[movement.exerciseId]?.name ?? movement.exerciseId;
            return {
              index: i,
              label: `MIN ${i + 1} — ${name}`,
              completed: false,
            };
          }),
        },
      };
    case "AMRAP":
      return {
        sectionId: section.id,
        timedBlock: { completed: false, timer: idleTimer(), cycles: [] },
      };
    case "FLOW":
      return {
        sectionId: section.id,
        timedBlock: {
          completed: false,
          timer: idleTimer(),
          cycles: Array.from({ length: section.rounds }, (_, r) =>
            section.movements.map((m, j) => {
              const name = m.displayName ?? EXERCISES_BY_ID[m.exerciseId]?.name ?? m.exerciseId;
              return {
                index: r * section.movements.length + j,
                label: `ROUND ${r + 1} — ${name}`,
                completed: false,
              };
            }),
          ).flat(),
        },
      };
  }
}

/**
 * Start a workout: deep-copy the template into an immutable snapshot and
 * scaffold empty results (spec §23 — never rewrite historical prescriptions).
 */
export function buildSession(template: DayTemplate, date: string): WorkoutSession {
  const snapshot: DayTemplate = JSON.parse(JSON.stringify(template));
  return {
    id: uid(),
    date,
    day: template.day,
    startedAt: nowISO(),
    snapshot,
    quote: template.quote,
    sections: template.sections.map(emptySectionResult),
  };
}
