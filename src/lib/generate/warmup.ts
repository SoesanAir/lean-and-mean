// Free Movement warm-up generation: balanced slots, day-specific bias,
// repetition avoidance against the last couple of warm-ups. Pure (randomness
// injectable for tests).

import type { DayTemplate, WarmupMovement, WarmupSection, WarmupTag, WorkoutSession } from "../types";
import { WARMUP_MOVEMENTS } from "../seed/warmups";

/** balanced slot plan — one movement per slot, in this order */
const SLOTS: WarmupTag[][] = [
  ["pulse"],
  ["shoulders", "neck"],
  ["wrists", "scapula"],
  ["spine", "rotation"],
  ["hips"],
  ["squat", "lunge"],
  ["floor-flow"],
];

const MIN_MOVEMENTS = 8;
const MAX_MOVEMENTS = 12;
const TARGET_SECONDS = 5 * 60; // ~4–6 min total

/** what the day's planned work asks us to prepare for (bias 1–3 movements) */
export function dayBiasTags(template: DayTemplate): WarmupTag[] {
  const tags: WarmupTag[] = [];
  for (const s of template.sections) {
    if ((s.type === "SKILL" && s.exerciseId === "handstand") ||
        (s.type === "SKILL_PRACTICE" && (s.familyId === "handstand-control" || s.familyId === "handstand-push-up"))) {
      tags.push("handstand-prep", "wrists", "scapula");
    }
    if (s.type === "SKILL_PRACTICE" &&
        (s.familyId === "pistol-squat" || s.familyId === "shrimp-squat" || s.familyId === "dragon-squat")) {
      tags.push("pistol-prep", "ankles", "squat");
    }
    if (s.type === "SKILL_PRACTICE" && (s.familyId.startsWith("ring-") || s.familyId === "skin-the-cat")) {
      tags.push("ring-prep", "wrists", "scapula");
    }
  }
  return [...new Set(tags)];
}

export function generateWarmupMovements(
  template: DayTemplate,
  recentMovementIds: string[],
  rand: () => number = Math.random,
): WarmupMovement[] {
  const used = new Set<string>();
  const picked: WarmupMovement[] = [];

  const pick = (pool: WarmupMovement[]): WarmupMovement | null => {
    const open = pool.filter((m) => !used.has(m.id));
    if (open.length === 0) return null;
    // avoid movements from the last couple of warm-ups when alternatives exist
    const fresh = open.filter((m) => !recentMovementIds.includes(m.id));
    const candidates = fresh.length > 0 ? fresh : open;
    const m = candidates[Math.floor(rand() * candidates.length)];
    used.add(m.id);
    picked.push(m);
    return m;
  };

  const byTags = (tags: WarmupTag[]) =>
    WARMUP_MOVEMENTS.filter((m) => m.tags.some((t) => tags.includes(t)));

  // 1. one movement per balanced slot
  for (const slot of SLOTS) pick(byTags(slot));

  // 2. bias 1–3 movements toward today's planned work
  const bias = dayBiasTags(template);
  if (bias.length > 0) {
    const biasPool = byTags(bias);
    pick(biasPool);
    if (rand() < 0.5) pick(biasPool);
  }

  // 3. fill to target volume with anything unused
  let totalSec = picked.reduce((s, m) => s + m.durationSeconds, 0);
  while (picked.length < MAX_MOVEMENTS && (picked.length < MIN_MOVEMENTS || totalSec < TARGET_SECONDS)) {
    const m = pick(WARMUP_MOVEMENTS);
    if (!m) break;
    totalSec += m.durationSeconds;
  }

  return picked;
}

export function buildWarmupSection(
  template: DayTemplate,
  recentMovementIds: string[],
  rand: () => number = Math.random,
): WarmupSection {
  const movements = generateWarmupMovements(template, recentMovementIds, rand);
  const totalSec = movements.reduce((s, m) => s + m.durationSeconds, 0);
  return {
    id: `wu-d${template.day}`,
    type: "WARMUP",
    title: "FREE MOVEMENT",
    emphasis: "SKILL",
    intro: "Flowing movement prep — smooth and dynamic, not stretching. Auto-advances every movement.",
    movements: movements.map((m) => ({ movementId: m.id, durationSeconds: m.durationSeconds })),
    targetMinutes: Math.round(totalSec / 60),
  };
}

/** movement ids used in the last N sessions' warm-ups (repetition avoidance) */
export function recentWarmupMovementIds(sessions: WorkoutSession[], lastN = 2): string[] {
  const ids: string[] = [];
  for (const s of sessions.slice(0, lastN)) {
    for (const section of s.snapshot.sections) {
      if (section.type === "WARMUP") ids.push(...section.movements.map((m) => m.movementId));
    }
  }
  return ids;
}
