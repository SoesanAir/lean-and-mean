import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { buildSession } from "@/lib/session/snapshot";
import { getDayTemplate } from "@/lib/seed/week1";
import { exerciseCatalog } from "@/lib/coach/shape";

const day1 = () => {
  const s = buildSession(getDayTemplate(1), "2026-08-27");
  s.finishedAt = "2026-08-27T10:00:00.000Z";
  return s;
};
const day6 = () => {
  const s = buildSession(getDayTemplate(6), "2026-08-29");
  s.finishedAt = "2026-08-29T10:00:00.000Z";
  return s;
};

describe("exerciseCatalog", () => {
  it("without query lists only performed exercises, most recent first", () => {
    const entries = exerciseCatalog([day1(), day6()], null, 50);
    expect(entries.every((e) => e.performed)).toBe(true);
    const ids = entries.map((e) => e.exerciseId);
    expect(ids).toContain("clean-strict-press");
    expect(ids).toContain("handstand");
    expect(ids).not.toContain("pull-up"); // never trained
    // day6 exercises performed more recently → before day1-only exercises
    expect(ids.indexOf("goblet-squat")).toBeLessThan(ids.indexOf("halo"));
  });

  it("counts sessions and tracks last performed date", () => {
    const entries = exerciseCatalog([day1(), day6()], "clean", 50);
    const cp = entries.find((e) => e.exerciseId === "clean-strict-press");
    expect(cp?.sessionsCount).toBe(2); // Day 1 straight sets + Day 6 EMOM
    expect(cp?.lastPerformed).toBe("2026-08-29");
  });

  it("resolves forgiving name variants: 'clean press', 'clean & press', 'C&P'", () => {
    const sessions = [day1()];
    for (const q of ["clean press", "clean & press", "C&P", "Clean and Press"]) {
      const entries = exerciseCatalog(sessions, q, 50);
      expect(entries.map((e) => e.exerciseId), q).toContain("clean-strict-press");
    }
  });

  it("exact id and exact name also match", () => {
    const sessions = [day1()];
    expect(exerciseCatalog(sessions, "clean-strict-press", 10)[0].exerciseId).toBe("clean-strict-press");
    expect(exerciseCatalog(sessions, "Suitcase Carry", 10)[0].exerciseId).toBe("suitcase-carry");
  });

  it("returns library matches flagged performed=false for untrained movements", () => {
    const entries = exerciseCatalog([day1()], "pull-up", 10);
    const pullUp = entries.find((e) => e.exerciseId === "pull-up");
    expect(pullUp?.performed).toBe(false);
    expect(pullUp?.sessionsCount).toBe(0);
    expect(pullUp?.lastPerformed).toBeUndefined();
  });

  it("unknown names return an empty list (no invention)", () => {
    expect(exerciseCatalog([day1()], "zercher yoke carry", 10)).toEqual([]);
  });

  it("respects the limit", () => {
    expect(exerciseCatalog([day1(), day6()], null, 3)).toHaveLength(3);
  });
});
