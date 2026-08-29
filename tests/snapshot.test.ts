import { beforeEach, describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";
import { buildSession } from "@/lib/session/snapshot";
import { getDayTemplate, WEEK1 } from "@/lib/seed/week1";
import type { DayTemplate, StraightSetsSection } from "@/lib/types";

installDomShim();

// spec §23 + §30.31 — workout snapshotting / historical data integrity
describe("prescription snapshot", () => {
  let template: DayTemplate;

  beforeEach(() => {
    template = JSON.parse(JSON.stringify(getDayTemplate(4)));
  });

  it("deep-copies the template so later template edits never rewrite history", () => {
    const session = buildSession(template, "2026-08-29");

    // simulate a future template change: Horn Curl 12 kg 3×8–12 → 16 kg 4×8
    const hornCurlSection = template.sections.find((s) => s.id === "d4-s2") as StraightSetsSection;
    const hornCurl = hornCurlSection.prescriptions[0];
    hornCurl.weightKg = 16;
    hornCurl.sets = 4;
    hornCurl.reps = 8;

    const snapSection = session.snapshot.sections.find((s) => s.id === "d4-s2") as StraightSetsSection;
    const snapCurl = snapSection.prescriptions[0];
    expect(snapCurl.weightKg).toBe(12);
    expect(snapCurl.sets).toBe(3);
    expect(snapCurl.reps).toBe("8–12");
  });

  it("scaffolds one set result per prescribed set", () => {
    const session = buildSession(getDayTemplate(1), "2026-08-29");
    const clean = session.sections.find((r) => r.sectionId === "d1-s3");
    expect(clean?.exercises?.[0].sets).toHaveLength(3);
    expect(clean?.exercises?.[0].sets.every((s) => !s.completed)).toBe(true);
  });

  it("scaffolds circuit sections as rounds × per-round sets", () => {
    const session = buildSession(getDayTemplate(4), "2026-08-29");
    const circuit = session.sections.find((r) => r.sectionId === "d4-s1");
    // 2 rounds × 1 set per round
    expect(circuit?.exercises?.[0].sets).toHaveLength(2);
  });

  it("scaffolds EMOM cycles per minute with exercise labels", () => {
    const session = buildSession(getDayTemplate(6), "2026-08-29");
    const emom = session.sections.find((r) => r.sectionId === "d6-s1");
    expect(emom?.timedBlock?.cycles).toHaveLength(15);
    expect(emom?.timedBlock?.cycles[0].label).toContain("Clean + Press");
    expect(emom?.timedBlock?.cycles[1].label).toContain("Goblet Squat");
    expect(emom?.timedBlock?.cycles[2].label).toContain("Swing");
    // pattern repeats: minute 4 (index 3) is clean+press again
    expect(emom?.timedBlock?.cycles[3].label).toContain("Clean + Press");
  });

  it("scaffolds flow cycles as rounds × movements", () => {
    const session = buildSession(getDayTemplate(2), "2026-08-29");
    const flow = session.sections.find((r) => r.sectionId === "d2-s1");
    expect(flow?.timedBlock?.cycles).toHaveLength(3 * 4);
  });

  it("every non-rest day builds a session with matching section results", () => {
    for (const day of WEEK1) {
      const session = buildSession(day, "2026-08-29");
      expect(session.sections).toHaveLength(day.sections.length);
      expect(session.snapshot).not.toBe(day); // different object
      expect(JSON.stringify(session.snapshot.sections)).toBe(JSON.stringify(day.sections));
    }
  });
});
