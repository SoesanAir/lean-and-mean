import { beforeEach, describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { WEEK1 } from "@/lib/seed/week1";
import { EXERCISES } from "@/lib/seed/exercises";
import { GRIP_DEFINITIONS, type GripType, isTimedSection } from "@/lib/types";
import { __resetStoreForTests, getState, startWorkout } from "@/lib/session/store";

const VALID_GRIPS = Object.keys(GRIP_DEFINITIONS) as GripType[];

beforeEach(() => {
  localStorage.clear();
  __resetStoreForTests();
});

// spec §30.33 — grip persistence; §11/§25 — grip is structured first-class data
describe("grip as first-class data", () => {
  it("every prescription in Week 1 has a structured grip value", () => {
    for (const day of WEEK1) {
      for (const section of day.sections) {
        const prescriptions =
          section.type === "STRAIGHT_SETS" || section.type === "CIRCUIT"
            ? section.prescriptions
            : isTimedSection(section)
              ? section.type === "EMOM"
                ? section.pattern
                : section.type === "AMRAP"
                  ? section.round
                  : section.movements
              : [];
        for (const p of prescriptions) {
          expect(VALID_GRIPS, `day ${day.day} / ${p.id}`).toContain(p.grip);
        }
      }
    }
  });

  it("every library exercise has a structured default grip", () => {
    for (const ex of EXERCISES) {
      expect(VALID_GRIPS, ex.id).toContain(ex.defaultGrip);
    }
  });

  it("spec grips are preserved in key prescriptions", () => {
    const day1 = WEEK1[0];
    const halo = day1.sections.find((s) => s.id === "d1-s2");
    const press = day1.sections.find((s) => s.id === "d1-s3");
    expect(halo && "prescriptions" in halo && halo.prescriptions[0].grip).toBe("HORNS");
    expect(press && "prescriptions" in press && press.prescriptions[0].grip).toBe("HANDLE");

    const day5 = WEEK1[4];
    const bottomUp = day5.sections.find((s) => s.id === "d5-s6");
    const ball = day5.sections.find((s) => s.id === "d5-s7");
    expect(bottomUp && "prescriptions" in bottomUp && bottomUp.prescriptions[0].grip).toBe("BOTTOM_UP_HANDLE");
    expect(ball && "prescriptions" in ball && ball.prescriptions[0].grip).toBe("BALL");
  });

  it("grip varies by movement inside a timed block while weight stays at block level", () => {
    const day3 = WEEK1[2];
    const amrap = day3.sections.find((s) => s.id === "d3-s3");
    if (!amrap || amrap.type !== "AMRAP") throw new Error("missing baseline AMRAP");
    const grips = amrap.round.map((m) => m.grip);
    expect(grips).toEqual(["HANDLE", "HORNS", "BODYWEIGHT", "HANDLE"]);
    expect(amrap.blockWeightKg).toBe(20);
  });

  it("grip survives the session snapshot and storage round-trip", () => {
    startWorkout(1);
    __resetStoreForTests();
    const session = getState().activeSession!;
    const halo = session.snapshot.sections.find((s) => s.id === "d1-s2");
    expect(halo && "prescriptions" in halo && halo.prescriptions[0].grip).toBe("HORNS");
    const lunge = session.snapshot.sections.find((s) => s.id === "d1-s4");
    expect(lunge && "prescriptions" in lunge && lunge.prescriptions[0].gripNotes).toBe("Rack position");
  });
});
