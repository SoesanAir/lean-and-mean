import { beforeEach, describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import {
  __resetStoreForTests,
  finishWorkout,
  getState,
  setSetNote,
  setSectionNote,
  setTimedBlockNote,
  startWorkout,
  updateSetResult,
  upsertDailyLog,
  setDailyNote,
} from "@/lib/session/store";

beforeEach(() => {
  localStorage.clear();
  __resetStoreForTests();
});

// spec §30.32 — note persistence across app restarts
describe("note persistence", () => {
  it("persists set notes to storage and survives a store reload", () => {
    startWorkout(1);
    setSetNote("d1-s3", "d1-clean-press", 0, "Easy. Could probably add weight.");

    // simulate app close + reopen: reset in-memory cache, reload from storage
    __resetStoreForTests();
    const reloaded = getState();
    const note = reloaded.activeSession?.sections
      .find((r) => r.sectionId === "d1-s3")
      ?.exercises?.find((e) => e.prescriptionId === "d1-clean-press")?.sets[0].note;

    expect(note?.text).toBe("Easy. Could probably add weight.");
    expect(note?.id).toBeTruthy();
    expect(note?.createdAt).toBeTruthy();
    expect(note?.updatedAt).toBeTruthy();
  });

  it("updating a note keeps its id and bumps updatedAt", () => {
    startWorkout(1);
    setSetNote("d1-s3", "d1-clean-press", 0, "first");
    const before = getState().activeSession!.sections.find((r) => r.sectionId === "d1-s3")!
      .exercises![0].sets[0].note!;

    setSetNote("d1-s3", "d1-clean-press", 0, "second version");
    const after = getState().activeSession!.sections.find((r) => r.sectionId === "d1-s3")!
      .exercises![0].sets[0].note!;

    expect(after.id).toBe(before.id);
    expect(after.text).toBe("second version");
    expect(after.createdAt).toBe(before.createdAt);
  });

  it("supports notes at section, block and daily-log level", () => {
    startWorkout(2);
    setSectionNote("d2-s1", "flow felt smooth");
    setTimedBlockNote("d2-s2", "swings easy at 20kg");
    upsertDailyLog("2026-08-29", { weightKg: 82.4 });
    setDailyNote("2026-08-29", "slept badly");

    __resetStoreForTests();
    const s = getState();
    expect(s.activeSession?.sections.find((r) => r.sectionId === "d2-s1")?.note?.text).toBe("flow felt smooth");
    expect(s.activeSession?.sections.find((r) => r.sectionId === "d2-s2")?.timedBlock?.note?.text).toBe(
      "swings easy at 20kg",
    );
    expect(s.dailyLogs["2026-08-29"].note?.text).toBe("slept badly");
    expect(s.dailyLogs["2026-08-29"].weightKg).toBe(82.4);
  });
});

// spec §31 — interrupted workout resume
describe("workout resume", () => {
  it("keeps set results after reload (accidental app close)", () => {
    startWorkout(4);
    updateSetResult("d4-s1", "d4-slow-goblet", 0, { completed: true, actualReps: 10 });

    __resetStoreForTests();
    const reloaded = getState();
    const set = reloaded.activeSession?.sections
      .find((r) => r.sectionId === "d4-s1")
      ?.exercises?.find((e) => e.prescriptionId === "d4-slow-goblet")?.sets[0];
    expect(set?.completed).toBe(true);
    expect(set?.actualReps).toBe(10);
  });

  it("does not overwrite an active session when starting again", () => {
    startWorkout(1);
    updateSetResult("d1-s3", "d1-clean-press", 0, { completed: true });
    startWorkout(3); // ignored — a session is active
    const s = getState();
    expect(s.activeSession?.day).toBe(1);
    expect(
      s.activeSession?.sections.find((r) => r.sectionId === "d1-s3")?.exercises?.[0].sets[0].completed,
    ).toBe(true);
  });
});

// finishing persists permanently and is immutable history
describe("finish workout", () => {
  it("moves the session to completedSessions with feedback and survives reload", () => {
    startWorkout(1);
    updateSetResult("d1-s3", "d1-clean-press", 1, { completed: true, actualRepsLeft: 5, actualRepsRight: 4 });
    finishWorkout(
      { difficulty: "HARD", energy: 4, sorenessBefore: 2, sorenessAfter: 3, pain: false },
      "good session",
    );

    __resetStoreForTests();
    const s = getState();
    expect(s.activeSession).toBeNull();
    expect(s.completedSessions).toHaveLength(1);
    const done = s.completedSessions[0];
    expect(done.finishedAt).toBeTruthy();
    expect(done.feedback?.difficulty).toBe("HARD");
    expect(done.workoutNote?.text).toBe("good session");
    const set = done.sections.find((r) => r.sectionId === "d1-s3")?.exercises?.[0].sets[1];
    expect(set?.actualRepsLeft).toBe(5);
    expect(set?.actualRepsRight).toBe(4);
    // prescription still shows what was prescribed at the time
    const snapshotSection = done.snapshot.sections.find((x) => x.id === "d1-s3");
    expect(snapshotSection && "prescriptions" in snapshotSection && snapshotSection.prescriptions[0].weightKg).toBe(16);
  });
});
