import type { SetsPrescription, TimedMovement } from "@/lib/types";

/** "3 × 5 / side", "3 × 30 sec / side", "2 × 6–8", "3 × 8 each direction" */
export function prescriptionLabel(p: SetsPrescription): string {
  const parts: string[] = [];
  if (p.durationSec) {
    parts.push(`${p.sets} × ${p.durationSec} sec`);
  } else if (p.reps !== undefined) {
    parts.push(`${p.sets} × ${p.reps}`);
  } else {
    parts.push(`${p.sets} sets`);
  }
  if (p.perSide) parts.push("/ side");
  if (p.eachDirection) parts.push("each direction");
  return parts.join(" ");
}

/** "8 swings", "6 / side", "5 each direction" */
export function movementLabel(m: TimedMovement): string {
  const parts: string[] = [`${m.reps}`];
  if (m.perSide) parts.push("/ side");
  if (m.eachDirection) parts.push("each direction");
  return parts.join(" ");
}

/** first integer in a reps prescription, for stepper defaults ("8–12" → 8) */
export function defaultReps(reps: number | string | undefined): number {
  if (typeof reps === "number") return reps;
  if (typeof reps === "string") {
    const m = reps.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return 0;
}
