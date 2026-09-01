import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import {
  adjustPhase,
  cuesBetween,
  planCues,
  planStatus,
  planWorkSeconds,
  PRESTART_SEC,
  sanitizePhases,
  skipPhase,
  type TimerPlan,
} from "@/lib/timing/engine";
import type { TimerPhase } from "@/lib/timing/engine";
import { amrapPlan, emomPlan, forTimePlan, holdsPlan, intervalPlan, warmupPlan } from "@/lib/timing/builders";
import { generateSessionPlan } from "@/lib/generate/plan";
import { getDayTemplate } from "@/lib/seed/week1";
import type {
  AmrapSection,
  EmomSection,
  IntervalSection,
  SkillPracticeSection,
  TimerState,
  WarmupSection,
} from "@/lib/types";

// ---- fake clock helpers: timer started at t=0, "now" passed explicitly ----
const T0 = 1_000_000_000;
const running = (skewMs = 0): TimerState => ({ status: "running", startedAt: T0, elapsedBeforePauseMs: 0, skewMs });
const at = (sec: number) => T0 + sec * 1000; // wall-clock at `sec` seconds after start

// generic alternating interval: 30 A / 30 B / 30 rest ×5 (built directly)
function altPlan(): TimerPlan {
  const phases: TimerPhase[] = [{ id: "c", kind: "COUNTDOWN", label: "GET READY", durationSec: 3 }];
  for (let r = 1; r <= 5; r++) {
    phases.push(
      { id: `a${r}`, kind: "WORK" as const, label: "KB Swing", durationSec: 30, round: r, totalRounds: 5 },
      { id: `b${r}`, kind: "WORK" as const, label: "Push-ups", durationSec: 30, round: r, totalRounds: 5 },
      { id: `r${r}`, kind: "REST" as const, label: "REST", durationSec: 30, round: r, totalRounds: 5 },
    );
  }
  return { id: "alt", mode: "INTERVAL", phases, endLabel: "DONE" };
}

describe("arbitrary interval sequencing (30 A / 30 B / 30 rest × 5)", () => {
  const plan = altPlan();

  it("pre-start countdown does not consume workout time", () => {
    const s = planStatus(plan, running(), at(1));
    expect(s.state).toBe("COUNTDOWN");
    expect(s.workoutElapsedSec).toBe(0);
    expect(planWorkSeconds(plan)).toBe(5 * 90);
    // at t=3 the first work phase begins with its FULL 30 seconds
    const s2 = planStatus(plan, running(), at(3));
    expect(s2.phase?.label).toBe("KB Swing");
    expect(s2.phaseRemainingSec).toBe(30);
  });

  it("knows current and NEXT at every transition", () => {
    let s = planStatus(plan, running(), at(3 + 5));
    expect(s.phase?.label).toBe("KB Swing");
    expect(s.nextPhase?.label).toBe("Push-ups");
    s = planStatus(plan, running(), at(3 + 35));
    expect(s.phase?.label).toBe("Push-ups");
    expect(s.nextPhase?.label).toBe("REST");
    s = planStatus(plan, running(), at(3 + 65));
    expect(s.phase?.kind).toBe("REST");
    expect(s.nextPhase?.label).toBe("KB Swing"); // round 2 begins
    expect(s.phase?.round).toBe(1);
  });

  it("counts rounds correctly through all five rounds and finishes", () => {
    const roundStart = (r: number) => 3 + (r - 1) * 90;
    for (let r = 1; r <= 5; r++) {
      const s = planStatus(plan, running(), at(roundStart(r) + 1));
      expect(s.phase?.round).toBe(r);
    }
    expect(planStatus(plan, running(), at(3 + 450)).state).toBe("FINISHED");
  });

  it("backgrounding across MULTIPLE phases lands in the correct phase", () => {
    // browser slept from t=3 (start of A round 1) until t=73 → A(30)+B(30) passed, 10 s into REST
    const s = planStatus(plan, running(), at(73));
    expect(s.phase?.kind).toBe("REST");
    expect(s.phaseElapsedSec).toBe(10);
    expect(s.phaseRemainingSec).toBe(20);
  });

  it("backgrounding for less than one phase keeps the same phase, correct remaining", () => {
    const s = planStatus(plan, running(), at(3 + 7)); // 7 s into A after a 7 s stall
    expect(s.phase?.label).toBe("KB Swing");
    expect(s.phaseRemainingSec).toBe(23);
  });
});

describe("pause / resume / skip / ±time", () => {
  const plan = altPlan();

  it("pause freezes logical time; resume continues from the same remaining", () => {
    // ran 10 s, then paused
    const paused: TimerState = { status: "paused", elapsedBeforePauseMs: 10_000 };
    const s = planStatus(plan, paused, at(9999)); // wall clock is irrelevant while paused
    expect(s.state).toBe("PAUSED");
    expect(s.phase?.label).toBe("KB Swing");
    expect(s.phaseRemainingSec).toBe(23);
    // resume: elapsedBeforePause preserved, startedAt fresh
    const resumed: TimerState = { status: "running", startedAt: at(100), elapsedBeforePauseMs: 10_000 };
    const s2 = planStatus(plan, resumed, at(101));
    expect(s2.phaseRemainingSec).toBe(22);
  });

  it("pause during the pre-start countdown works too", () => {
    const paused: TimerState = { status: "paused", elapsedBeforePauseMs: 1_500 };
    expect(planStatus(plan, paused, at(50)).state).toBe("PAUSED");
    expect(planStatus(plan, paused, at(50)).phase?.kind).toBe("COUNTDOWN");
  });

  it("skip advances exactly to the next phase without corrupting rounds", () => {
    const t = running();
    const patch = skipPhase(plan, t, at(3 + 5))!; // 25 s left in A round 1
    expect(patch.skewMs).toBe(25_000);
    const after = { ...t, ...patch };
    const s = planStatus(plan, after, at(3 + 5));
    expect(s.phase?.label).toBe("Push-ups");
    expect(s.phase?.round).toBe(1);
    // repeated skips walk phase by phase and clamp at the end
    let cur: TimerState = after;
    for (let i = 0; i < 50; i++) {
      const p = skipPhase(plan, cur, at(3 + 5));
      if (!p) break;
      cur = { ...cur, ...p };
    }
    expect(planStatus(plan, cur, at(3 + 5)).state).toBe("FINISHED");
    expect(skipPhase(plan, cur, at(3 + 5))).toBeNull(); // skipping when finished: no-op
  });

  it("±15 adjusts the current phase and clamps at its boundaries", () => {
    const t = running();
    const plus = adjustPhase(plan, t, 15, at(3 + 20))!; // 10 s remaining → +15 → 25 s
    expect(planStatus(plan, { ...t, ...plus }, at(3 + 20)).phaseRemainingSec).toBe(25);
    const minus = adjustPhase(plan, t, -15, at(3 + 20))!; // 10 s remaining → −15 clamps to 0 → next phase
    const s = planStatus(plan, { ...t, ...minus }, at(3 + 20));
    expect(s.phase?.label).toBe("Push-ups");
  });
});

describe("EMOM", () => {
  const emom: EmomSection = {
    id: "e",
    type: "EMOM",
    title: "MAIN EMOM",
    minutes: 12,
    blockWeightKg: 16,
    pattern: [
      { id: "m1", kind: "TIMED_MOVEMENT", exerciseId: "kb-swing", grip: "HANDLE", reps: 10 },
      { id: "m2", kind: "TIMED_MOVEMENT", exerciseId: "push-up", grip: "BODYWEIGHT", reps: 8, bodyweight: true },
      { id: "m3", kind: "TIMED_MOVEMENT", exerciseId: "clean-strict-press", grip: "HANDLE", reps: 5, perSide: true },
    ],
  };
  const plan = emomPlan(emom);

  it("creates one phase per minute with correct labels, minute counter and repeat", () => {
    expect(plan.phases).toHaveLength(1 + 12);
    const s = planStatus(plan, running(), at(3 + 3 * 60 + 5)); // minute 4
    expect(s.phase?.round).toBe(4);
    expect(s.phase?.totalRounds).toBe(12);
    expect(s.phase?.roundWord).toBe("Minute");
    expect(s.phase?.label).toBe("Two-hand Kettlebell Swing"); // pattern repeats: minute 4 = movement 1
    expect(s.phase?.detail).toContain("16 kg");
  });

  it("transition boundaries land exactly on the minute", () => {
    expect(planStatus(plan, running(), at(3 + 59.5)).phase?.round).toBe(1);
    expect(planStatus(plan, running(), at(3 + 60.5)).phase?.round).toBe(2);
  });

  it("E2MOM: intervalSec 120 halves the rounds and doubles each phase", () => {
    const e2 = emomPlan({ ...emom, intervalSec: 120 });
    expect(e2.phases).toHaveLength(1 + 6);
    expect(e2.phases[1].durationSec).toBe(120);
    expect(planStatus(e2, running(), at(3 + 119)).phase?.round).toBe(1);
    expect(planStatus(e2, running(), at(3 + 121)).phase?.round).toBe(2);
  });

  it("plays 3-2-1 beeps then GO before each minute, END after the last", () => {
    const cues = planCues(plan);
    // end of minute 1 at logical 63: beeps at 60,61,62 + go at 63
    expect(cues.filter((c) => c.at > 59 && c.at < 63).map((c) => c.sound)).toEqual(["beep", "beep", "beep"]);
    expect(cues.find((c) => c.at === 63)?.sound).toBe("go");
    // final boundary is END, not GO
    const last = cues[cues.length - 1];
    expect(last.at).toBe(3 + 12 * 60);
    expect(last.sound).toBe("end");
  });
});

describe("AMRAP", () => {
  const amrap: AmrapSection = {
    id: "a",
    type: "AMRAP",
    title: "AMRAP",
    minutes: 12,
    blockWeightKg: 20,
    round: [{ id: "r1", kind: "TIMED_MOVEMENT", exerciseId: "kb-swing", grip: "HANDLE", reps: 5 }],
  };
  const plan = amrapPlan(amrap);

  it("counts down the full duration (no artificial per-exercise timers)", () => {
    expect(plan.phases).toHaveLength(2); // countdown + one 12-min work phase
    const s = planStatus(plan, running(), at(3 + 60));
    expect(s.workoutRemainingSec).toBe(11 * 60);
    expect(planStatus(plan, running(), at(3 + 12 * 60 + 1)).state).toBe("FINISHED");
  });

  it("warns at 10 s, beeps 3-2-1, and ENDS (never GO)", () => {
    const cues = planCues(plan);
    const end = 3 + 720;
    expect(cues.find((c) => c.at === end - 10)?.sound).toBe("warn");
    expect(cues.filter((c) => c.at >= end - 3 && c.at < end).map((c) => c.sound)).toEqual(["beep", "beep", "beep"]);
    expect(cues.find((c) => c.at === end)?.sound).toBe("end");
    expect(cues.some((c) => c.sound === "go" && c.at === end)).toBe(false);
    // pre-start GO exists (that one IS a go)
    expect(cues.find((c) => c.at === 3)?.sound).toBe("go");
  });
});

describe("intervals / tabata / holds / for-time / warm-up builders", () => {
  it("tabata: 20 work / 10 rest × 8 is just the interval engine", () => {
    const tabata: IntervalSection = {
      id: "t", type: "INTERVAL", title: "TABATA", exerciseId: "kb-swing", rounds: 8, workSec: 20, restSec: 10,
    };
    const plan = intervalPlan(tabata);
    // 8 work + 7 rests (no rest after final work) + countdown
    expect(plan.phases).toHaveLength(1 + 8 + 7);
    expect(planWorkSeconds(plan)).toBe(8 * 20 + 7 * 10);
    const s = planStatus(plan, running(), at(3 + 25)); // 5 s into rest 1
    expect(s.phase?.kind).toBe("REST");
    expect(s.phaseRemainingSec).toBe(5);
  });

  it("holds: 4 × 15 s hold / 45 s rest from the same engine", () => {
    const section: SkillPracticeSection = {
      id: "sp", type: "SKILL_PRACTICE", title: "L-SIT", familyId: "l-sit",
      variationId: "l-sit-tuck", prescription: { sets: 4, holdSec: 15, restSec: 45 }, targetMinutes: 6,
    };
    const plan = holdsPlan(section, "l-sit-tuck")!;
    // NOTE: uses the library variation's own prescription for the selected id
    const holdPhases = plan.phases.filter((p) => p.kind === "HOLD");
    const restPhases = plan.phases.filter((p) => p.kind === "REST");
    expect(holdPhases.length).toBeGreaterThanOrEqual(3);
    expect(restPhases.length).toBe(holdPhases.length - 1);
    expect(holdPhases[0].label.toLowerCase()).toContain("tuck");
  });

  it("reps/attempt-based skill practice gets NO timer plan (manual logging)", () => {
    const section: SkillPracticeSection = {
      id: "sp2", type: "SKILL_PRACTICE", title: "HS", familyId: "handstand-control",
      variationId: "x", prescription: { sets: 1, attempts: 6 }, targetMinutes: 8,
    };
    expect(holdsPlan(section, "nonexistent-variation")).toBeNull();
  });

  it("for time: open stopwatch without cap, both clocks with cap", () => {
    const open = forTimePlan("ft", "5 rounds for time");
    const s = planStatus(open, running(), at(3 + 95));
    expect(s.phaseRemainingSec).toBe(Infinity);
    expect(s.workoutElapsedSec).toBe(95);
    expect(s.workoutRemainingSec).toBeNull();
    const capped = forTimePlan("ft2", "For time", 600);
    const s2 = planStatus(capped, running(), at(3 + 100));
    expect(s2.workoutElapsedSec).toBe(100);
    expect(s2.workoutRemainingSec).toBe(500);
    expect(planCues(capped).find((c) => c.at === 3 + 590)?.sound).toBe("warn");
  });

  it("warm-up flows run on the same engine with soft cues", () => {
    const wu: WarmupSection = {
      id: "wu", type: "WARMUP", title: "FREE MOVEMENT", targetMinutes: 2,
      movements: [
        { movementId: "body-bounces", durationSeconds: 30 },
        { movementId: "arm-swings", durationSeconds: 30 },
        { movementId: "full-body-twists", durationSeconds: 30 },
      ],
    };
    const plan = warmupPlan(wu);
    const s = planStatus(plan, running(), at(3 + 35));
    expect(s.phase?.label).toBe("Arm Swings");
    expect(s.nextPhase?.label).toBe("Full-body Twists");
    // soft: single tick per transition, no 3-2-1 alarm
    const cues = planCues(plan);
    expect(cues.filter((c) => c.sound === "beep")).toHaveLength(0);
    expect(cues.filter((c) => c.sound === "tick").length).toBe(2); // between movements
    expect(cues[cues.length - 1].sound).toBe("end");
  });

  it("zero-duration phases are dropped unless trailing open-ended", () => {
    const cleaned = sanitizePhases([
      { id: "x", kind: "WORK", label: "A", durationSec: 0 },
      { id: "y", kind: "WORK", label: "B", durationSec: 30 },
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].label).toBe("B");
  });
});

describe("cue crossing (driver behavior)", () => {
  const plan = altPlan();
  it("returns exactly the cues between two logical instants", () => {
    // crossing the end of phase A round 1 (logical 33): beeps at 30,31,32, go at 33
    expect(cuesBetween(plan, 29.9, 33.1).map((c) => c.sound)).toEqual(["beep", "beep", "beep", "go"]);
    expect(cuesBetween(plan, 31.5, 32.5).map((c) => c.sound)).toEqual(["beep"]);
    expect(cuesBetween(plan, 33.1, 33.1)).toHaveLength(0);
  });
  it("labels the transition by what comes NEXT (GO vs REST vs DONE)", () => {
    const cues = planCues(plan);
    expect(cues.find((c) => c.at === 63)?.sound).toBe("rest"); // B → REST
    expect(cues.find((c) => c.at === 63)?.label).toBe("REST");
    expect(cues.find((c) => c.at === 93)?.sound).toBe("go"); // REST → A round 2
    expect(cues[cues.length - 1].sound).toBe("end"); // workout end → DONE
  });
});

describe("integration with the generated program", () => {
  it("every timed section in a generated session has an executable plan", async () => {
    const { planForSection } = await import("@/lib/timing/builders");
    for (const day of [1, 2, 3, 4, 5, 6]) {
      const plan = generateSessionPlan(getDayTemplate(day), []);
      for (const section of plan.sections) {
        if (["EMOM", "AMRAP", "INTERVAL", "WARMUP"].includes(section.type)) {
          const tp = planForSection(section);
          expect(tp, `${day}/${section.id}`).not.toBeNull();
          expect(tp!.phases.length).toBeGreaterThan(1);
          expect(tp!.phases.every((p, i) => p.durationSec > 0 || i === tp!.phases.length - 1)).toBe(true);
        }
      }
    }
  });

  it("PRESTART constant matches the 3-2-1 convention", () => {
    expect(PRESTART_SEC).toBe(3);
  });
});
