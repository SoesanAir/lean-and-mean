import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { WARMUP_MOVEMENTS, WARMUP_MOVEMENTS_BY_ID } from "@/lib/seed/warmups";
import { buildWarmupSection, dayBiasTags, generateWarmupMovements, recentWarmupMovementIds } from "@/lib/generate/warmup";
import { getDayTemplate } from "@/lib/seed/week1";
import { buildSession } from "@/lib/session/snapshot";

// deterministic PRNG for reproducible generation tests
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("warm-up movement library", () => {
  it("every movement has mandatory written instructions (no name-only movements)", () => {
    expect(WARMUP_MOVEMENTS.length).toBeGreaterThanOrEqual(35);
    for (const m of WARMUP_MOVEMENTS) {
      expect(m.shortCue.trim().length, m.id).toBeGreaterThan(10);
      expect(m.instructions.length, m.id).toBeGreaterThanOrEqual(3);
      m.instructions.forEach((s) => expect(s.trim().length, m.id).toBeGreaterThan(10));
      expect(m.tags.length, m.id).toBeGreaterThanOrEqual(1);
      expect(m.durationSeconds, m.id).toBeGreaterThanOrEqual(20);
    }
  });

  it("has no invented video URLs", () => {
    for (const m of WARMUP_MOVEMENTS) expect(m.videoUrl, m.id).toBeUndefined();
  });
});

describe("warm-up generation", () => {
  const day1 = getDayTemplate(1);

  it("produces 8–12 movements totalling roughly 4–6 minutes", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const ms = generateWarmupMovements(day1, [], seeded(seed));
      expect(ms.length).toBeGreaterThanOrEqual(8);
      expect(ms.length).toBeLessThanOrEqual(12);
      const total = ms.reduce((s, m) => s + m.durationSeconds, 0);
      expect(total).toBeGreaterThanOrEqual(4 * 60 - 30);
      expect(total).toBeLessThanOrEqual(6.5 * 60);
      // no duplicates
      expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
    }
  });

  it("builds a balanced sequence (pulse, shoulders, spine, hips, squat, floor)", () => {
    const ms = generateWarmupMovements(day1, [], seeded(7));
    const tags = new Set(ms.flatMap((m) => m.tags));
    expect(tags.has("pulse")).toBe(true);
    expect(tags.has("hips")).toBe(true);
    expect([...tags].some((t) => t === "shoulders" || t === "neck")).toBe(true);
    expect([...tags].some((t) => t === "spine" || t === "rotation")).toBe(true);
    expect([...tags].some((t) => t === "squat" || t === "lunge")).toBe(true);
    expect(tags.has("floor-flow")).toBe(true);
  });

  it("varies between workouts and avoids recently used movements when alternatives exist", () => {
    const first = generateWarmupMovements(day1, [], seeded(1)).map((m) => m.id);
    const second = generateWarmupMovements(day1, first, seeded(2)).map((m) => m.id);
    const overlap = second.filter((id) => first.includes(id));
    // some overlap is fine (small pools like "pulse"), wholesale repetition is not
    expect(overlap.length).toBeLessThan(second.length / 2);
    expect(second.join()).not.toBe(first.join());
  });

  it("biases handstand days toward wrists/shoulders/scapula prep", () => {
    expect(dayBiasTags(getDayTemplate(1))).toContain("handstand-prep"); // Day 1 has handstand practice
    const ms = generateWarmupMovements(getDayTemplate(1), [], seeded(3));
    const prep = ms.filter((m) =>
      m.tags.some((t) => t === "handstand-prep" || t === "wrists" || t === "scapula"),
    );
    expect(prep.length).toBeGreaterThanOrEqual(1);
    expect(prep.length).toBeLessThanOrEqual(4); // bias, not takeover
  });

  it("records generated movements in the session snapshot (repetition history)", () => {
    const section = buildWarmupSection(day1, [], seeded(4));
    const template = { ...day1, sections: [section, ...day1.sections] };
    const session = buildSession(template, "2026-09-01");
    session.finishedAt = "2026-09-01T10:00:00.000Z";
    const recent = recentWarmupMovementIds([session]);
    expect(recent).toEqual(section.movements.map((m) => m.movementId));
    expect(recent.every((id) => WARMUP_MOVEMENTS_BY_ID[id])).toBe(true);
  });
});
