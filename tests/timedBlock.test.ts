import { describe, expect, it } from "vitest";
import { WEEK1 } from "@/lib/seed/week1";
import { validateDayTemplate, validateSingleWeightRule } from "@/lib/session/validation";
import { isTimedSection, type EmomSection, type TimedMovement } from "@/lib/types";

// spec §30.34 — timed-block single-weight rule (spec §13)
describe("one weight per timed section", () => {
  it("all Week 1 templates pass validation", () => {
    for (const day of WEEK1) {
      expect(validateDayTemplate(day), `day ${day.day}`).toEqual([]);
    }
  });

  it("every timed section in Week 1 declares a block-level weight", () => {
    for (const day of WEEK1) {
      for (const section of day.sections) {
        if (isTimedSection(section)) {
          expect(section.blockWeightKg, `${section.id}`).not.toBeUndefined();
          expect(section.blockWeightKg, `${section.id}`).not.toBeNull();
        }
      }
    }
  });

  it("no timed movement carries its own weight", () => {
    for (const day of WEEK1) {
      for (const section of day.sections) {
        if (!isTimedSection(section)) continue;
        const movements =
          section.type === "EMOM" ? section.pattern : section.type === "AMRAP" ? section.round : section.movements;
        for (const m of movements) {
          expect((m as unknown as Record<string, unknown>).weightKg, `${section.id}/${m.id}`).toBeUndefined();
        }
      }
    }
  });

  it("detects a violating movement injected into a timed section", () => {
    const bad: EmomSection = {
      id: "bad-emom",
      type: "EMOM",
      title: "BAD EMOM",
      minutes: 6,
      blockWeightKg: 20,
      pattern: [
        {
          id: "bad-swing",
          kind: "TIMED_MOVEMENT",
          exerciseId: "kb-swing",
          grip: "HANDLE",
          reps: 8,
          // simulating untyped data smuggling a per-exercise weight in
          ...( { weightKg: 24 } as Partial<TimedMovement> ),
        },
      ],
    };
    const errors = validateSingleWeightRule(bad);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("blockWeightKg");
  });

  it("spec block weights are correct (Day 2: 20, Day 3: 24 + 20, Day 6: 16, flows 12)", () => {
    const byId = new Map(
      WEEK1.flatMap((d) => d.sections).map((s) => [s.id, s]),
    );
    const expectWeight = (id: string, kg: number) => {
      const s = byId.get(id);
      if (!s || !isTimedSection(s)) throw new Error(`${id} is not a timed section`);
      expect(s.blockWeightKg, id).toBe(kg);
    };
    expectWeight("d2-s1", 12);
    expectWeight("d2-s2", 20);
    expectWeight("d3-s2", 24);
    expectWeight("d3-s3", 20);
    expectWeight("d6-s1", 16);
  });
});
