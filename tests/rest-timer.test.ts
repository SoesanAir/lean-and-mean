import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { planRestAfterSet, sectionAllowsRest } from "@/lib/session/restLogic";
import { adjustRest, getRestTimer, restRemainingSec, skipRest, startRest } from "@/lib/session/restTimer";
import type { SetResult, SetsPrescription } from "@/lib/types";

const press: SetsPrescription = {
  id: "p",
  kind: "SETS",
  exerciseId: "clean-strict-press",
  grip: "HANDLE",
  sets: 3,
  reps: 5,
  perSide: true,
  weightKg: 16,
  restSeconds: 90,
};

const sets = (done: boolean[]): SetResult[] =>
  done.map((completed, setIndex) => ({ setIndex, completed }));

describe("rest planning (spec: only between sets of the SAME exercise)", () => {
  it("starts rest after a non-final set", () => {
    const plan = planRestAfterSet("STRAIGHT_SETS", press, sets([true, false, false]), 0);
    expect(plan).toEqual({ seconds: 90, nextSetIndex: 1 });
  });

  it("does NOT start rest after the final set", () => {
    expect(planRestAfterSet("STRAIGHT_SETS", press, sets([true, true, true]), 2)).toBeNull();
  });

  it("does NOT start rest when the remaining sets are already done/skipped", () => {
    const s = sets([false, true, true]);
    s[0].completed = true; // completing the only open set (out of order)
    expect(planRestAfterSet("STRAIGHT_SETS", press, s, 0)).toBeNull();
  });

  it("targets the earliest open set when completing out of order", () => {
    const plan = planRestAfterSet("STRAIGHT_SETS", press, sets([false, false, true]), 2 - 1);
    // completed set 2 (index 1), set 0 still open → next is set 0? no: prefer after, none after open except.. index2 done → falls back to earliest open (0)
    expect(planRestAfterSet("STRAIGHT_SETS", press, sets([false, true, true]), 1)?.nextSetIndex).toBe(0);
    expect(plan?.nextSetIndex).toBe(0);
  });

  it("never triggers without a prescribed restSeconds", () => {
    const noRest = { ...press, restSeconds: undefined };
    expect(planRestAfterSet("STRAIGHT_SETS", noRest, sets([true, false, false]), 0)).toBeNull();
  });

  it("never triggers in circuits, timed blocks or intervals", () => {
    for (const type of ["CIRCUIT", "EMOM", "AMRAP", "FLOW", "INTERVAL", "SKILL", "WARMUP", "SKILL_PRACTICE"] as const) {
      expect(sectionAllowsRest(type), type).toBe(false);
      expect(planRestAfterSet(type, press, sets([true, false, false]), 0)).toBeNull();
    }
    expect(sectionAllowsRest("STRAIGHT_SETS")).toBe(true);
  });
});

describe("rest timer engine (absolute endsAt — background/refresh safe)", () => {
  it("computes remaining from endsAt, not by decrementing", () => {
    startRest("k1", "Set 2 — Clean + Strict Press", 90);
    const t = getRestTimer()!;
    expect(restRemainingSec(t, t.endsAt - 90_000)).toBe(90);
    expect(restRemainingSec(t, t.endsAt - 30_500)).toBe(31);
    // 40 seconds of app-in-background changes nothing — remaining derives from the clock
    expect(restRemainingSec(t, t.endsAt)).toBe(0);
    expect(restRemainingSec(t, t.endsAt + 5_000)).toBe(0);
  });

  it("replaces the previous timer instead of duplicating on repeated taps", () => {
    startRest("k1", "Set 2 — Press", 90);
    startRest("k1", "Set 2 — Press", 90);
    startRest("k2", "Set 3 — Press", 60);
    const t = getRestTimer()!;
    expect(t.key).toBe("k2");
    expect(t.totalSeconds).toBe(60);
  });

  it("supports +/− adjustments and skip", () => {
    startRest("k3", "Set 2 — Row", 60);
    const before = getRestTimer()!.endsAt;
    adjustRest(15);
    expect(getRestTimer()!.endsAt).toBeGreaterThan(before);
    adjustRest(-1000); // clamps, never negative
    expect(restRemainingSec(getRestTimer()!)).toBeGreaterThanOrEqual(4);
    skipRest();
    expect(getRestTimer()).toBeNull();
  });
});
