import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { buildSession } from "@/lib/session/snapshot";
import { getDayTemplate } from "@/lib/seed/week1";
import type { WorkoutSession } from "@/lib/types";
import { collectNotes, exerciseHistory, shapeSessionDetail, weekView } from "@/lib/coach/shape";

const NOW = "2026-08-29T10:00:00.000Z";
const note = (text: string, updatedAt = NOW) => ({ id: `n-${text}`, text, createdAt: NOW, updatedAt });

function day1Session(): WorkoutSession {
  const s = buildSession(getDayTemplate(1), "2026-08-29");
  const press = s.sections.find((r) => r.sectionId === "d1-s3")!.exercises![0];
  press.sets[0] = { setIndex: 0, completed: true, actualRepsLeft: 5, actualRepsRight: 5, note: note("16 kg felt easy.") };
  s.workoutNote = note("Shoulder felt good.");
  s.finishedAt = NOW;
  s.feedback = { difficulty: "HARD", energy: 4, pain: false };
  return s;
}

describe("shapeSessionDetail", () => {
  it("surfaces weight, grip, actuals and notes from the immutable snapshot", () => {
    const detail = shapeSessionDetail(day1Session());
    expect(detail.status).toBe("completed");
    expect(detail.emphasis).toBe("QUALITY > QUANTITY");
    const press = detail.sections.find((s) => s.id === "d1-s3");
    if (!press || !("exercises" in press)) throw new Error("missing press section");
    const ex = press.exercises![0];
    expect(ex.prescription.name).toBe("Clean + Strict Press");
    expect(ex.prescription.weightKg).toBe(16);
    expect(ex.prescription.grip).toBe("HANDLE");
    expect(ex.sets[0].actualRepsLeft).toBe(5);
    expect(ex.sets[0].note).toBe("16 kg felt easy.");
    expect(detail.workoutNote).toBe("Shoulder felt good.");
    expect(detail.feedback?.difficulty).toBe("HARD");
  });

  it("shows the single block weight for timed sections (spec §13)", () => {
    const s = buildSession(getDayTemplate(3), "2026-08-29");
    const detail = shapeSessionDetail(s);
    const amrap = detail.sections.find((x) => x.id === "d3-s3");
    if (!amrap || !("blockWeightKg" in amrap)) throw new Error("missing AMRAP");
    expect(amrap.blockWeightKg).toBe(20);
    expect(amrap.isBenchmark).toBe(true);
    expect(amrap.movements!.map((m) => m.grip)).toEqual(["HANDLE", "HORNS", "BODYWEIGHT", "HANDLE"]);
  });
});

describe("exerciseHistory", () => {
  it("includes straight-sets AND timed-block appearances with block weight context", () => {
    const d1 = day1Session();
    const d3 = buildSession(getDayTemplate(3), "2026-08-28");
    d3.finishedAt = NOW;
    const entries = exerciseHistory([d1, d3], "one-arm-row", 20);
    const contexts = entries.map((e) => e.context).join(" | ");
    expect(entries.length).toBe(2);
    expect(contexts).toContain("ONE-ARM ROW"); // Day 1 straight sets
    expect(contexts).toContain("20 kg block"); // Day 3 AMRAP
    const setsEntry = entries.find((e) => e.prescription.weightKg === 20);
    expect(setsEntry?.prescription.grip).toBe("HANDLE");
  });

  it("respects the limit", () => {
    const sessions = [day1Session(), day1Session(), day1Session()];
    expect(exerciseHistory(sessions, "clean-strict-press", 2)).toHaveLength(2);
  });
});

describe("collectNotes", () => {
  it("labels notes with exercise + day context and sorts newest first", () => {
    const s = day1Session();
    const press = s.sections.find((r) => r.sectionId === "d1-s3")!.exercises![0];
    press.sets[1] = { setIndex: 1, completed: true, note: note("Left arm shakier.", "2026-08-29T11:00:00.000Z") };
    const notes = collectNotes([s], [{ date: "2026-08-29", note: note("slept badly", "2026-08-29T09:00:00.000Z") }], 20);
    expect(notes[0].text).toBe("Left arm shakier."); // newest first
    const cp = notes.find((n) => n.text === "16 kg felt easy.");
    expect(cp?.context).toContain("Clean + Strict Press");
    expect(cp?.context).toContain("Day 1");
    expect(notes.at(-1)?.text).toBe("slept badly");
  });

  it("respects the limit", () => {
    const s = day1Session();
    expect(collectNotes([s], [], 1)).toHaveLength(1);
  });
});

describe("weekView / summarizeSession", () => {
  it("counts completed workouts and carries benchmark results", () => {
    const d3 = buildSession(getDayTemplate(3), "2026-08-26");
    d3.finishedAt = NOW;
    const amrap = d3.sections.find((r) => r.sectionId === "d3-s3")!.timedBlock!;
    amrap.completed = true;
    amrap.resultSummary = "6 rounds + 14 reps";
    const dates = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"];
    const week = weekView([d3], [], "2026-08-24", dates);
    expect(week.workoutsCompleted).toBe(1);
    const day = week.days.find((d) => d.date === "2026-08-26");
    expect(day?.sessions[0].benchmarks[0]).toEqual({ title: "WEEK 1 BASELINE AMRAP", result: "6 rounds + 14 reps" });
  });
});
