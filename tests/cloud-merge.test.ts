import { describe, expect, it } from "vitest";
import { installDomShim } from "./localStorageShim";

installDomShim();

import { buildSession } from "@/lib/session/snapshot";
import { getDayTemplate } from "@/lib/seed/week1";
import type { AppState } from "@/lib/session/store";
import type { WorkoutSession } from "@/lib/types";
import { dailyLogToRow, sessionToRow, type DailyLogRow, type SessionRow } from "@/lib/cloud/mapping";
import { dailyKey, emptyMeta, mergeCloud, sessionKey, type SyncMeta } from "@/lib/cloud/merge";

const T0 = "2026-08-01T10:00:00.000Z";
const T1 = "2026-08-01T11:00:00.000Z";
const T2 = "2026-08-01T12:00:00.000Z";

function makeState(partial: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    activeSession: null,
    completedSessions: [],
    dailyLogs: {},
    quoteOverrides: {},
    ...partial,
  };
}

function sessionRow(s: WorkoutSession, updatedAt: string): SessionRow {
  return { ...sessionToRow(s, updatedAt), user_id: "u1" } as SessionRow;
}

function dailyRow(date: string, weightKg: number, updatedAt: string): DailyLogRow {
  return {
    ...dailyLogToRow({ date, weightKg }, updatedAt),
    id: `log-${date}`,
    user_id: "u1",
  } as DailyLogRow;
}

function makeSession(day: number, opts: { finished?: boolean } = {}): WorkoutSession {
  const s = buildSession(getDayTemplate(day), "2026-08-01");
  if (opts.finished) {
    s.finishedAt = T0;
    s.feedback = { difficulty: "RIGHT", pain: false };
  }
  return s;
}

describe("mergeCloud — legacy migration", () => {
  it("pushes local-only sessions and daily logs (idempotent by id — no duplicates)", () => {
    const localDone = makeSession(1, { finished: true });
    const local = makeState({
      completedSessions: [localDone],
      dailyLogs: { "2026-08-01": { date: "2026-08-01", weightKg: 82 } },
    });
    const r = mergeCloud(local, emptyMeta(), [], []);
    expect(r.pushKeys).toContain(sessionKey(localDone.id));
    expect(r.pushKeys).toContain(dailyKey("2026-08-01"));
    expect(r.state.completedSessions).toHaveLength(1);

    // second merge after cloud has it: no push, still exactly one copy
    const meta2: SyncMeta = { ...r.meta, remoteUpdatedAt: { [sessionKey(localDone.id)]: T1 } };
    const r2 = mergeCloud(r.state, meta2, [sessionRow(localDone, T1)], []);
    expect(r2.pushKeys).not.toContain(sessionKey(localDone.id));
    expect(r2.state.completedSessions).toHaveLength(1);
  });
});

describe("mergeCloud — completed sessions are canonical", () => {
  it("a session finished in the cloud replaces the same local active session", () => {
    const s = makeSession(1);
    const local = makeState({ activeSession: s });
    const finishedRemote = { ...s, finishedAt: T1 };
    const r = mergeCloud(local, emptyMeta(), [sessionRow(finishedRemote, T1)], []);
    expect(r.state.activeSession).toBeNull();
    expect(r.state.completedSessions.map((x) => x.id)).toContain(s.id);
    expect(r.pushKeys).toHaveLength(0);
  });

  it("stale local dirt cannot push over a finished cloud session", () => {
    const s = makeSession(1);
    const meta = emptyMeta();
    meta.dirtyAt[sessionKey(s.id)] = T0; // local edits from before
    const finishedRemote = { ...s, finishedAt: T2 };
    const r = mergeCloud(makeState({ activeSession: s }), meta, [sessionRow(finishedRemote, T2)], []);
    expect(r.pushKeys).not.toContain(sessionKey(s.id));
    expect(r.meta.dirtyAt[sessionKey(s.id)]).toBeUndefined();
    expect(r.state.completedSessions[0].finishedAt).toBe(T2);
  });
});

describe("mergeCloud — active session last-write-wins", () => {
  it("adopts the cloud active session when the cloud copy is newer", () => {
    const s = makeSession(1);
    const meta = emptyMeta();
    meta.remoteUpdatedAt[sessionKey(s.id)] = T0;
    const newerRemote = JSON.parse(JSON.stringify(s)) as WorkoutSession;
    newerRemote.sections[1].exercises![0].sets[0].completed = true;
    const r = mergeCloud(makeState({ activeSession: s }), meta, [sessionRow(newerRemote, T2)], []);
    expect(r.state.activeSession?.sections[1].exercises![0].sets[0].completed).toBe(true);
    expect(r.pushKeys).toHaveLength(0);
  });

  it("keeps + pushes the local active session when local edits are newer", () => {
    const s = makeSession(1);
    const meta = emptyMeta();
    meta.remoteUpdatedAt[sessionKey(s.id)] = T0;
    meta.dirtyAt[sessionKey(s.id)] = T2; // local edit after remote update T1
    const r = mergeCloud(makeState({ activeSession: s }), meta, [sessionRow(s, T1)], []);
    expect(r.state.activeSession?.id).toBe(s.id);
    expect(r.pushKeys).toContain(sessionKey(s.id));
  });

  it("cloud wins when two devices have different active sessions", () => {
    const mine = makeSession(1);
    const theirs = makeSession(2);
    const r = mergeCloud(makeState({ activeSession: mine }), emptyMeta(), [sessionRow(theirs, T2)], []);
    expect(r.state.activeSession?.id).toBe(theirs.id);
  });

  it("a fresh device adopts the cloud active session", () => {
    const theirs = makeSession(3);
    const r = mergeCloud(makeState(), emptyMeta(), [sessionRow(theirs, T1)], []);
    expect(r.state.activeSession?.id).toBe(theirs.id);
    expect(r.state.activeSession?.snapshot.day).toBe(3);
  });
});

describe("mergeCloud — daily logs", () => {
  it("cloud newer wins; local dirty newer pushes", () => {
    const meta = emptyMeta();
    meta.remoteUpdatedAt[dailyKey("2026-08-01")] = T0;
    meta.dirtyAt[dailyKey("2026-08-02")] = T2;
    meta.remoteUpdatedAt[dailyKey("2026-08-02")] = T0;
    const local = makeState({
      dailyLogs: {
        "2026-08-01": { date: "2026-08-01", weightKg: 80 },
        "2026-08-02": { date: "2026-08-02", weightKg: 81 },
      },
    });
    const r = mergeCloud(local, meta, [], [dailyRow("2026-08-01", 83, T2), dailyRow("2026-08-02", 99, T1)]);
    // cloud newer for 08-01 → adopted
    expect(r.state.dailyLogs["2026-08-01"].weightKg).toBe(83);
    // local dirty newer for 08-02 → kept + pushed
    expect(r.state.dailyLogs["2026-08-02"].weightKg).toBe(81);
    expect(r.pushKeys).toContain(dailyKey("2026-08-02"));
  });

  it("adopts cloud-only logs on a fresh device", () => {
    const r = mergeCloud(makeState(), emptyMeta(), [], [dailyRow("2026-08-05", 82.5, T1)]);
    expect(r.state.dailyLogs["2026-08-05"].weightKg).toBe(82.5);
    expect(r.pushKeys).toHaveLength(0);
  });
});

describe("mergeCloud — local deletions in flight", () => {
  it("does not resurrect a completed session whose cloud delete hasn't flushed", () => {
    const s = makeSession(1, { finished: true });
    const meta = emptyMeta();
    meta.pendingDeletes = [sessionKey(s.id)];
    // cloud still has the row (delete not flushed yet)
    const r = mergeCloud(makeState(), meta, [sessionRow(s, T1)], []);
    expect(r.state.completedSessions).toHaveLength(0);
    expect(r.pushKeys).toHaveLength(0);
    expect(r.meta.pendingDeletes).toContain(sessionKey(s.id));
  });

  it("does not resurrect a daily log whose cloud delete hasn't flushed", () => {
    const meta = emptyMeta();
    meta.pendingDeletes = [dailyKey("2026-08-01")];
    const r = mergeCloud(makeState(), meta, [], [dailyRow("2026-08-01", 82, T1)]);
    expect(r.state.dailyLogs["2026-08-01"]).toBeUndefined();
  });
});

describe("mergeCloud — remote deletions", () => {
  it("drops a previously synced session that disappeared from the cloud", () => {
    const s = makeSession(1, { finished: true });
    const meta = emptyMeta();
    meta.remoteUpdatedAt[sessionKey(s.id)] = T1;
    const r = mergeCloud(makeState({ completedSessions: [s] }), meta, [], []);
    expect(r.state.completedSessions).toHaveLength(0);
    expect(r.pushKeys).toHaveLength(0);
  });
});
