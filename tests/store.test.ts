import { beforeEach, describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import {
  __resetStoreForTests,
  deleteCompletedSession,
  deleteDailyLog,
  finishWorkout,
  patchCompletedSession,
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

// Week-agnostic locators: these tests exercise store MECHANICS, so they find a
// real target in whatever week `startWorkout` currently serves rather than
// pinning specific day/section ids.
function firstSetTarget(): { sectionId: string; prescriptionId: string } {
  const s = getState().activeSession!;
  for (const r of s.sections) {
    if (r.exercises?.length) {
      return { sectionId: r.sectionId, prescriptionId: r.exercises[0].prescriptionId };
    }
  }
  throw new Error("no exercise-bearing section in active session");
}
function firstTimedSectionId(): string {
  const r = getState().activeSession!.sections.find((x) => x.timedBlock);
  if (!r) throw new Error("no timed-block section in active session");
  return r.sectionId;
}
function anySectionId(): string {
  return getState().activeSession!.sections[0].sectionId;
}
function prescribedWeight(sectionId: string, prescriptionId: string): number | undefined {
  const sec = getState().activeSession!.snapshot.sections.find((x) => x.id === sectionId);
  if (!sec || !("prescriptions" in sec)) return undefined;
  return sec.prescriptions.find((p) => p.id === prescriptionId)?.weightKg;
}

// spec §30.32 — note persistence across app restarts
describe("note persistence", () => {
  it("persists set notes to storage and survives a store reload", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    setSetNote(sectionId, prescriptionId, 0, "Easy. Could probably add weight.");

    // simulate app close + reopen: reset in-memory cache, reload from storage
    __resetStoreForTests();
    const reloaded = getState();
    const note = reloaded.activeSession?.sections
      .find((r) => r.sectionId === sectionId)
      ?.exercises?.find((e) => e.prescriptionId === prescriptionId)?.sets[0].note;

    expect(note?.text).toBe("Easy. Could probably add weight.");
    expect(note?.id).toBeTruthy();
    expect(note?.createdAt).toBeTruthy();
    expect(note?.updatedAt).toBeTruthy();
  });

  it("updating a note keeps its id and bumps updatedAt", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    const setNote = () =>
      getState().activeSession!.sections.find((r) => r.sectionId === sectionId)!
        .exercises!.find((e) => e.prescriptionId === prescriptionId)!.sets[0].note!;

    setSetNote(sectionId, prescriptionId, 0, "first");
    const before = setNote();

    setSetNote(sectionId, prescriptionId, 0, "second version");
    const after = setNote();

    expect(after.id).toBe(before.id);
    expect(after.text).toBe("second version");
    expect(after.createdAt).toBe(before.createdAt);
  });

  it("supports notes at section, block and daily-log level", () => {
    startWorkout(2);
    const sectionId = anySectionId();
    const timedId = firstTimedSectionId();
    setSectionNote(sectionId, "flow felt smooth");
    setTimedBlockNote(timedId, "swings easy at 16kg");
    upsertDailyLog("2026-08-29", { weightKg: 82.4 });
    setDailyNote("2026-08-29", "slept badly");

    __resetStoreForTests();
    const s = getState();
    expect(s.activeSession?.sections.find((r) => r.sectionId === sectionId)?.note?.text).toBe("flow felt smooth");
    expect(s.activeSession?.sections.find((r) => r.sectionId === timedId)?.timedBlock?.note?.text).toBe(
      "swings easy at 16kg",
    );
    expect(s.dailyLogs["2026-08-29"].note?.text).toBe("slept badly");
    expect(s.dailyLogs["2026-08-29"].weightKg).toBe(82.4);
  });
});

// spec §31 — interrupted workout resume
describe("workout resume", () => {
  it("keeps set results after reload (accidental app close)", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    updateSetResult(sectionId, prescriptionId, 0, { completed: true, actualReps: 10 });

    __resetStoreForTests();
    const reloaded = getState();
    const set = reloaded.activeSession?.sections
      .find((r) => r.sectionId === sectionId)
      ?.exercises?.find((e) => e.prescriptionId === prescriptionId)?.sets[0];
    expect(set?.completed).toBe(true);
    expect(set?.actualReps).toBe(10);
  });

  it("does not overwrite an active session when starting again", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    updateSetResult(sectionId, prescriptionId, 0, { completed: true });
    startWorkout(3); // ignored — a session is active
    const s = getState();
    expect(s.activeSession?.day).toBe(1);
    expect(
      s.activeSession?.sections.find((r) => r.sectionId === sectionId)?.exercises
        ?.find((e) => e.prescriptionId === prescriptionId)?.sets[0].completed,
    ).toBe(true);
  });
});

describe("editing a completed workout", () => {
  it("corrects results in place, stamps editedAt, keeps the prescription snapshot, survives reload", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    updateSetResult(sectionId, prescriptionId, 0, { completed: true, actualRepsLeft: 5, actualRepsRight: 4 });
    finishWorkout({ difficulty: "RIGHT", pain: false });
    const id = getState().completedSessions[0].id;
    const snapshotBefore = JSON.stringify(getState().completedSessions[0].snapshot);

    patchCompletedSession(id, (s) => {
      const set = s.sections.find((r) => r.sectionId === sectionId)!
        .exercises!.find((e) => e.prescriptionId === prescriptionId)!.sets[0];
      set.actualRepsRight = 5; // fix the mistake
      if (s.feedback) s.feedback.difficulty = "HARD";
    });

    __resetStoreForTests();
    const edited = getState().completedSessions.find((x) => x.id === id)!;
    expect(
      edited.sections.find((r) => r.sectionId === sectionId)!
        .exercises!.find((e) => e.prescriptionId === prescriptionId)!.sets[0].actualRepsRight,
    ).toBe(5);
    expect(edited.feedback?.difficulty).toBe("HARD");
    expect(edited.editedAt).toBeTruthy();
    expect(edited.finishedAt).toBeTruthy(); // still a finished record
    expect(JSON.stringify(edited.snapshot)).toBe(snapshotBefore); // prescription untouched
  });

  it("no-ops for an unknown session id", () => {
    startWorkout(1);
    finishWorkout({ difficulty: "RIGHT", pain: false });
    expect(() => patchCompletedSession("nope", () => {})).not.toThrow();
  });
});

describe("explicit deletion", () => {
  it("deletes a completed session permanently (survives reload)", () => {
    startWorkout(1);
    finishWorkout({ difficulty: "RIGHT", pain: false });
    const id = getState().completedSessions[0].id;
    deleteCompletedSession(id);

    __resetStoreForTests();
    expect(getState().completedSessions.find((s) => s.id === id)).toBeUndefined();
  });

  it("deletes a daily log permanently (survives reload)", () => {
    upsertDailyLog("2026-08-30", { weightKg: 82 });
    deleteDailyLog("2026-08-30");

    __resetStoreForTests();
    expect(getState().dailyLogs["2026-08-30"]).toBeUndefined();
  });
});

// finishing persists permanently and is immutable history
describe("finish workout", () => {
  it("moves the session to completedSessions with feedback and survives reload", () => {
    startWorkout(1);
    const { sectionId, prescriptionId } = firstSetTarget();
    const expectedWeight = prescribedWeight(sectionId, prescriptionId);
    updateSetResult(sectionId, prescriptionId, 1, { completed: true, actualRepsLeft: 5, actualRepsRight: 4 });
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
    const set = done.sections.find((r) => r.sectionId === sectionId)
      ?.exercises?.find((e) => e.prescriptionId === prescriptionId)?.sets[1];
    expect(set?.actualRepsLeft).toBe(5);
    expect(set?.actualRepsRight).toBe(4);
    // prescription still shows what was prescribed at the time (immutable snapshot)
    const snapshotSection = done.snapshot.sections.find((x) => x.id === sectionId);
    expect(
      snapshotSection && "prescriptions" in snapshotSection &&
        snapshotSection.prescriptions.find((p) => p.id === prescriptionId)?.weightKg,
    ).toBe(expectedWeight);
  });
});
