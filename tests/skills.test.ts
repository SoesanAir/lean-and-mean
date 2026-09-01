import { beforeEach, describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import {
  getSkillVariation,
  neighborVariation,
  SKILL_FAMILIES,
  SKILL_FAMILIES_BY_ID,
  SKILL_STARTING_LEVELS,
} from "@/lib/seed/skills";
import { baselineVariation, latestPerformedVariationId, leastRecentlyTrainedFamily } from "@/lib/generate/baseline";
import { generateSessionPlan } from "@/lib/generate/plan";
import { getDayTemplate } from "@/lib/seed/week1";
import { buildSession } from "@/lib/session/snapshot";
import {
  __resetStoreForTests,
  finishWorkout,
  getState,
  scaleSkill,
  startWorkout,
  updateSkillSet,
} from "@/lib/session/store";
import type { SkillPracticeSection, WorkoutSession } from "@/lib/types";

beforeEach(() => {
  localStorage.clear();
  __resetStoreForTests();
});

// ---------- library integrity ----------

describe("skill progression library", () => {
  it("every variation has mandatory instructions and a valid prescription", () => {
    for (const f of SKILL_FAMILIES) {
      expect(f.variations.length, f.id).toBeGreaterThanOrEqual(3);
      for (const v of f.variations) {
        expect(v.instructions.length, v.id).toBeGreaterThanOrEqual(3);
        expect(v.shortCue.trim().length, v.id).toBeGreaterThan(5);
        expect(v.defaultPrescription.sets, v.id).toBeGreaterThanOrEqual(1);
        expect(v.videoUrl, v.id).toBeUndefined(); // no invented URLs
      }
    }
  });

  it("levels are strictly ordered 1..N (progression is data, not display text)", () => {
    for (const f of SKILL_FAMILIES) {
      const levels = f.variations.map((v) => v.level);
      expect(levels, f.id).toEqual(Array.from({ length: levels.length }, (_, i) => i + 1));
    }
  });

  it("neighborVariation moves exactly one level and stops at boundaries", () => {
    const lsit = SKILL_FAMILIES_BY_ID["l-sit"];
    const first = lsit.variations[0];
    const mid = lsit.variations[2];
    expect(neighborVariation("l-sit", first.id, "down")).toBeNull(); // easiest — no Scale Down
    expect(neighborVariation("l-sit", first.id, "up")?.level).toBe(2);
    expect(neighborVariation("l-sit", mid.id, "down")?.level).toBe(2);
    expect(neighborVariation("l-sit", mid.id, "up")?.level).toBe(4);
    const last = lsit.variations[lsit.variations.length - 1];
    expect(neighborVariation("l-sit", last.id, "up")).toBeNull(); // hardest — no Scale Up
  });

  it("athlete starting levels: handstand at walking, l-sit at tuck, not beginner-everything", () => {
    const hs = getSkillVariation("handstand-control", SKILL_STARTING_LEVELS["handstand-control"]);
    expect(hs).toBeTruthy();
    expect(hs!.level).toBeGreaterThanOrEqual(6); // he already walks on his hands
    expect(hs!.name.toLowerCase()).toContain("walk");
    const ls = getSkillVariation("l-sit", SKILL_STARTING_LEVELS["l-sit"]);
    expect(ls!.name.toLowerCase()).toContain("tuck"); // cannot do a full L-sit yet
    const fullLsit = SKILL_FAMILIES_BY_ID["l-sit"].variations.find((v) => v.level >= 7);
    expect(ls!.level).toBeLessThan(fullLsit!.level);
  });

  it("equipment-gated families are present but unavailable", () => {
    for (const id of ["ring-support", "ring-dip", "front-lever", "back-lever", "skin-the-cat"]) {
      expect(SKILL_FAMILIES_BY_ID[id]?.isAvailable, id).toBe(false);
    }
  });
});

// ---------- plan generation ----------

describe("session plan generation", () => {
  it("prepends warm-up and converts handstand practice to the progression system", () => {
    const plan = generateSessionPlan(getDayTemplate(1), []);
    expect(plan.sections[0].type).toBe("WARMUP");
    const skill = plan.sections.find((s) => s.type === "SKILL_PRACTICE") as SkillPracticeSection;
    expect(skill.familyId).toBe("handstand-control");
    expect(skill.variationId).toBe(SKILL_STARTING_LEVELS["handstand-control"]);
    expect(skill.targetMinutes).toBe(8); // keeps the template's intended duration
    // rest of the template intact
    expect(plan.sections.filter((s) => s.type === "STRAIGHT_SETS").length).toBe(5);
  });

  it("adds ONE short rotating skill block on non-handstand days", () => {
    const plan = generateSessionPlan(getDayTemplate(2), []);
    const skills = plan.sections.filter((s) => s.type === "SKILL_PRACTICE") as SkillPracticeSection[];
    expect(skills).toHaveLength(1);
    expect(skills[0].targetMinutes).toBeLessThanOrEqual(6); // no session inflation
    expect(["l-sit", "pistol-squat", "crow-to-tuck-planche"]).toContain(skills[0].familyId);
  });

  it("leaves the rest day untouched", () => {
    const plan = generateSessionPlan(getDayTemplate(7), []);
    expect(plan.sections).toHaveLength(0);
  });

  it("rotates skill families across sessions (least recently trained)", () => {
    const s1 = buildSession(generateSessionPlan(getDayTemplate(2), []), "2026-09-01");
    s1.finishedAt = "2026-09-01T10:00:00.000Z";
    const fam1 = (s1.snapshot.sections.find((s) => s.type === "SKILL_PRACTICE") as SkillPracticeSection).familyId;
    const plan2 = generateSessionPlan(getDayTemplate(4), [s1]);
    const fam2 = (plan2.sections.find((s) => s.type === "SKILL_PRACTICE") as SkillPracticeSection).familyId;
    expect(fam2).not.toBe(fam1);
  });
});

// ---------- scale up/down + persistence ----------

describe("Scale Down / Scale Up", () => {
  function activeSkillSection(): { sectionId: string; familyId: string } {
    const s = getState().activeSession!;
    const sec = s.snapshot.sections.find((x) => x.type === "SKILL_PRACTICE") as SkillPracticeSection;
    return { sectionId: sec.id, familyId: sec.familyId };
  }

  it("moves one level, preserves the original prescription, records the adjustment", () => {
    startWorkout(1); // handstand day
    const { sectionId, familyId } = activeSkillSection();
    const original = (getState().activeSession!.snapshot.sections.find((x) => x.id === sectionId) as SkillPracticeSection).variationId;
    const originalLevel = getSkillVariation(familyId, original)!.level;

    scaleSkill(sectionId, "down");
    let state = getState();
    let result = state.activeSession!.sections.find((r) => r.sectionId === sectionId)!.skillPractice!;
    expect(getSkillVariation(familyId, result.selectedVariationId)!.level).toBe(originalLevel - 1);
    expect(result.manualAdjustment).toBe("scaled_down");
    // snapshot untouched — originally prescribed variation preserved
    expect((state.activeSession!.snapshot.sections.find((x) => x.id === sectionId) as SkillPracticeSection).variationId).toBe(original);

    scaleSkill(sectionId, "up"); // back to original → adjustment clears
    result = getState().activeSession!.sections.find((r) => r.sectionId === sectionId)!.skillPractice!;
    expect(result.selectedVariationId).toBe(original);
    expect(result.manualAdjustment).toBeNull();

    scaleSkill(sectionId, "up");
    result = getState().activeSession!.sections.find((r) => r.sectionId === sectionId)!.skillPractice!;
    expect(result.manualAdjustment).toBe("scaled_up");

    // survives reload
    __resetStoreForTests();
    state = getState();
    result = state.activeSession!.sections.find((r) => r.sectionId === sectionId)!.skillPractice!;
    expect(result.manualAdjustment).toBe("scaled_up");
  });

  it("stops at ladder boundaries", () => {
    startWorkout(2); // rotating skill block at a starting level
    const { sectionId, familyId } = activeSkillSection();
    // hammer Scale Down far past the bottom
    for (let i = 0; i < 20; i++) scaleSkill(sectionId, "down");
    const result = getState().activeSession!.sections.find((r) => r.sectionId === sectionId)!.skillPractice!;
    expect(getSkillVariation(familyId, result.selectedVariationId)!.level).toBe(1);
  });
});

// ---------- history + next-week baseline ----------

describe("history + baseline", () => {
  it("history stores original vs performed variation with stable ids; next session starts from what was performed", () => {
    startWorkout(1);
    const s = getState().activeSession!;
    const sec = s.snapshot.sections.find((x) => x.type === "SKILL_PRACTICE") as SkillPracticeSection;
    const original = sec.variationId;

    scaleSkill(sec.id, "down");
    const performedId = getState().activeSession!.sections.find((r) => r.sectionId === sec.id)!.skillPractice!.selectedVariationId;
    updateSkillSet(sec.id, 0, { completed: true });
    finishWorkout({ difficulty: "RIGHT", pain: false });

    const done = getState().completedSessions[0];
    const histSection = done.snapshot.sections.find((x) => x.id === sec.id) as SkillPracticeSection;
    const histResult = done.sections.find((r) => r.sectionId === sec.id)!.skillPractice!;
    expect(histSection.variationId).toBe(original); // originally prescribed
    expect(histResult.selectedVariationId).toBe(performedId); // actually performed
    expect(histResult.manualAdjustment).toBe("scaled_down");

    // baseline for the next plan = performed level, not the original prescription
    expect(latestPerformedVariationId([done], "handstand-control")).toBe(performedId);
    const nextPlan = generateSessionPlan(getDayTemplate(1), [done]);
    const nextSec = nextPlan.sections.find((x) => x.type === "SKILL_PRACTICE") as SkillPracticeSection;
    expect(nextSec.variationId).toBe(performedId);
  });

  it("baseline ignores sessions where nothing was performed", () => {
    startWorkout(1);
    const s = getState().activeSession!;
    const sec = s.snapshot.sections.find((x) => x.type === "SKILL_PRACTICE") as SkillPracticeSection;
    scaleSkill(sec.id, "down"); // selected but never completed a set
    finishWorkout({ difficulty: "RIGHT", pain: false });
    expect(latestPerformedVariationId(getState().completedSessions, "handstand-control")).toBeNull();
    expect(baselineVariation(getState().completedSessions, "handstand-control").id).toBe(
      SKILL_STARTING_LEVELS["handstand-control"],
    );
  });

  it("leastRecentlyTrainedFamily prefers never-trained families", () => {
    expect(leastRecentlyTrainedFamily([], ["l-sit", "pistol-squat"])).toBe("l-sit");
  });
});

// ---------- backward compatibility ----------

describe("legacy sessions keep loading", () => {
  it("a pre-feature session (old SKILL section, no warm-up, no restSeconds) still computes progress", async () => {
    // simulate an old stored session: raw Day 1 template, no plan enrichment
    const legacy: WorkoutSession = buildSession(
      JSON.parse(JSON.stringify(getDayTemplate(1))),
      "2026-08-25",
    );
    legacy.finishedAt = "2026-08-25T10:00:00.000Z";
    const { sessionProgress } = await import("@/lib/session/progress");
    const prog = sessionProgress(legacy);
    expect(prog.total).toBeGreaterThan(0);
    const { shapeSessionDetail } = await import("@/lib/coach/shape");
    const detail = shapeSessionDetail(legacy);
    expect(detail.sections.some((x) => x && "prescribedMinutes" in x)).toBe(true); // legacy SKILL renders
  });
});
