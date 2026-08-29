import type { DayTemplate, TimedMovement, WorkoutSection } from "../types";
import { isTimedSection } from "../types";

/**
 * Spec §13 — ONE WEIGHT PER TIMED SECTION.
 * TimedMovement has no weight field at the type level; this runtime validator
 * protects against untyped data (JSON from a database or manual edits).
 */
export function validateSingleWeightRule(section: WorkoutSection): string[] {
  const errors: string[] = [];
  if (!isTimedSection(section)) return errors;

  const movements: TimedMovement[] =
    section.type === "EMOM" ? section.pattern : section.type === "AMRAP" ? section.round : section.movements;

  for (const m of movements) {
    const anyM = m as unknown as Record<string, unknown>;
    if (anyM.weightKg !== undefined) {
      errors.push(
        `Timed section "${section.title}" movement "${m.exerciseId}" carries its own weight (${anyM.weightKg} kg). ` +
          `Weight must live at block level (blockWeightKg).`,
      );
    }
  }
  return errors;
}

export function validateDayTemplate(template: DayTemplate): string[] {
  return template.sections.flatMap(validateSingleWeightRule);
}
