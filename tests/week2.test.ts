import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { WEEK2 } from "@/lib/seed/week2";
import { CURRENT_WEEK, getCurrentDayTemplate, WEEK_START_DATE } from "@/lib/seed/program";
import { EXERCISES_BY_ID } from "@/lib/seed/exercises";
import { SKILL_FAMILIES_BY_ID } from "@/lib/seed/skills";
import { validateDayTemplate } from "@/lib/session/validation";
import { generateSessionPlan } from "@/lib/generate/plan";
import { buildSession } from "@/lib/session/snapshot";
import { nextProgramDay, sessionProgress } from "@/lib/session/progress";
import type { WorkoutSession } from "@/lib/types";

const trainingDays = WEEK2.filter((d) => !d.isRest);

describe("WEEK2 program", () => {
  it("is the current published week and has 6 training days + a rest day", () => {
    expect(CURRENT_WEEK).toBe(WEEK2);
    expect(WEEK2.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(trainingDays).toHaveLength(6);
    expect(WEEK2[6].isRest).toBe(true);
    expect(getCurrentDayTemplate(4).name).toBe("HARD DAY");
  });

  it("only references available exercises that exist in the library", () => {
    for (const day of WEEK2) {
      for (const s of day.sections) {
        const ids: string[] = [];
        if (s.type === "STRAIGHT_SETS" || s.type === "CIRCUIT") ids.push(...s.prescriptions.map((p) => p.exerciseId));
        if (s.type === "EMOM") ids.push(...s.pattern.map((m) => m.exerciseId));
        if (s.type === "AMRAP") ids.push(...s.round.map((m) => m.exerciseId));
        if (s.type === "FLOW") ids.push(...s.movements.map((m) => m.exerciseId));
        if (s.type === "SKILL") ids.push(s.exerciseId);
        for (const id of ids) {
          const ex = EXERCISES_BY_ID[id];
          expect(ex, `${day.day}/${s.id}: ${id}`).toBeDefined();
          expect(ex.isAvailable, `${id} available`).toBe(true);
        }
        if (s.type === "SKILL_PRACTICE") {
          expect(SKILL_FAMILIES_BY_ID[s.familyId], s.familyId).toBeDefined();
        }
      }
    }
  });

  it("obeys the one-weight-per-timed-section rule everywhere", () => {
    for (const day of WEEK2) {
      expect(validateDayTemplate(day), `day ${day.day}`).toEqual([]);
    }
  });

  it("avoids jump rope / jumping (toe injury) across the week", () => {
    const allIds = WEEK2.flatMap((d) =>
      d.sections.flatMap((s) => {
        if (s.type === "INTERVAL" || s.type === "SKILL") return [s.exerciseId];
        if (s.type === "STRAIGHT_SETS" || s.type === "CIRCUIT") return s.prescriptions.map((p) => p.exerciseId);
        if (s.type === "EMOM") return s.pattern.map((m) => m.exerciseId);
        if (s.type === "AMRAP") return s.round.map((m) => m.exerciseId);
        if (s.type === "FLOW") return s.movements.map((m) => m.exerciseId);
        return [];
      }),
    );
    expect(allIds).not.toContain("jump-rope");
  });

  it("every training day builds a valid session (warm-up + skill injected)", () => {
    for (const day of trainingDays) {
      const plan = generateSessionPlan(getCurrentDayTemplate(day.day), []);
      expect(plan.sections[0].type).toBe("WARMUP");
      expect(plan.sections.some((s) => s.type === "SKILL_PRACTICE")).toBe(true);
      const session = buildSession(plan, "2026-09-05");
      expect(session.sections).toHaveLength(plan.sections.length);
      expect(sessionProgress(session).percent).toBe(0);
    }
  });
});

describe("nextProgramDay week anchoring", () => {
  const done = (day: number, date: string): WorkoutSession => {
    const s = buildSession(getCurrentDayTemplate(day), date);
    s.finishedAt = `${date}T10:00:00.000Z`;
    return s;
  };

  it("ignores sessions completed before the week start → opens on Day 1", () => {
    const prevWeek = [done(4, "2026-09-03"), done(3, "2026-09-02"), done(2, "2026-09-01"), done(1, "2026-08-31")];
    expect(nextProgramDay(prevWeek, WEEK_START_DATE)).toBe(1);
  });

  it("advances through the new week once its sessions are logged", () => {
    const sessions = [done(1, "2026-09-05"), done(4, "2026-09-03"), done(1, "2026-08-31")];
    expect(nextProgramDay(sessions, WEEK_START_DATE)).toBe(2);
  });
});
