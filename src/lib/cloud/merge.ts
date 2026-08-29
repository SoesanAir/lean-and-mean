// Pure merge logic for cloud sync — no I/O, fully unit-testable.
//
// Model: Supabase is the source of truth; localStorage is a cache + unsynced
// working copy. Per entity we track:
//   - shadow: the JSON we last synced (to detect local edits)
//   - remoteUpdatedAt: the cloud updated_at we last saw
//   - dirtyAt: when the entity was last edited locally (set while offline/unsynced)
//
// Rules (documented in docs/product-plan.md):
//   1. Finished (completed) cloud sessions always win — history is immutable
//      and a stale local copy must never overwrite a finished session.
//   2. Otherwise last-write-wins per entity via updated_at vs dirtyAt.
//   3. Local entities the cloud has never seen are pushed (this is also the
//      legacy localStorage migration — ids are stable UUIDs, so upserts are
//      idempotent and cannot create duplicates).
//   4. An entity previously synced but now missing in the cloud was deleted
//      remotely → drop it locally.
//   5. If both devices somehow have *different* active sessions, the cloud one
//      wins (one-active-session rule; enforced by a partial unique index).

import type { AppState } from "../session/store";
import type { WorkoutSession } from "../types";
import { rowToSession, rowToDailyLog, type DailyLogRow, type SessionRow } from "./mapping";

export interface SyncMeta {
  /** last-synced serialization per entity key ("s:<id>" | "d:<date>") */
  shadows: Record<string, string>;
  /** cloud updated_at we last saw per entity key */
  remoteUpdatedAt: Record<string, string>;
  /** local-edit timestamp per dirty entity key */
  dirtyAt: Record<string, string>;
  /** entity keys locally deleted since last sync (unfinished sessions only) */
  pendingDeletes: string[];
  lastUserId?: string;
}

export const emptyMeta = (): SyncMeta => ({
  shadows: {},
  remoteUpdatedAt: {},
  dirtyAt: {},
  pendingDeletes: [],
});

export const sessionKey = (id: string) => `s:${id}`;
export const dailyKey = (date: string) => `d:${date}`;

export function serializeSession(s: WorkoutSession): string {
  return JSON.stringify(s);
}

/** All local entities as key → serialized JSON (used for local-edit detection). */
export function localEntities(state: AppState): Map<string, string> {
  const map = new Map<string, string>();
  if (state.activeSession) {
    map.set(sessionKey(state.activeSession.id), serializeSession(state.activeSession));
  }
  for (const s of state.completedSessions) {
    map.set(sessionKey(s.id), serializeSession(s));
  }
  for (const [date, log] of Object.entries(state.dailyLogs)) {
    map.set(dailyKey(date), JSON.stringify(log));
  }
  return map;
}

export interface MergeResult {
  state: AppState;
  meta: SyncMeta;
  /** entity keys that must be pushed to the cloud after the merge */
  pushKeys: string[];
}

export function mergeCloud(
  local: AppState,
  meta: SyncMeta,
  cloudSessions: SessionRow[],
  cloudLogs: DailyLogRow[],
): MergeResult {
  const nextMeta: SyncMeta = JSON.parse(JSON.stringify(meta));
  const pushKeys = new Set<string>();

  const cloudById = new Map(cloudSessions.map((r) => [r.id, r]));

  // ---------- completed sessions ----------
  const completed: WorkoutSession[] = [];
  for (const row of cloudSessions) {
    if (row.finished_at) {
      // rule 1: finished cloud sessions are canonical
      completed.push(rowToSession(row));
      const key = sessionKey(row.id);
      nextMeta.remoteUpdatedAt[key] = row.updated_at;
      nextMeta.shadows[key] = serializeSession(rowToSession(row));
      delete nextMeta.dirtyAt[key];
    }
  }
  for (const s of local.completedSessions) {
    if (!cloudById.has(s.id)) {
      const key = sessionKey(s.id);
      if (nextMeta.remoteUpdatedAt[key]) {
        // rule 4: previously synced, deleted remotely → drop locally
        delete nextMeta.shadows[key];
        delete nextMeta.remoteUpdatedAt[key];
        delete nextMeta.dirtyAt[key];
      } else {
        // rule 3: cloud never saw it → push (legacy migration path)
        completed.push(s);
        pushKeys.add(key);
      }
    }
  }
  completed.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  // ---------- active session ----------
  const cloudActive = cloudSessions
    .filter((r) => !r.finished_at)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
  let active: WorkoutSession | null = local.activeSession;

  if (local.activeSession) {
    const key = sessionKey(local.activeSession.id);
    const cloudRow = cloudById.get(local.activeSession.id);
    if (cloudRow?.finished_at) {
      // finished on another device — the completed cloud version wins
      active = null;
      delete nextMeta.dirtyAt[key];
    } else if (cloudActive && cloudActive.id !== local.activeSession.id) {
      // rule 5: different active sessions — cloud wins
      active = rowToSession(cloudActive);
      delete nextMeta.dirtyAt[key];
      delete nextMeta.shadows[key];
    } else if (cloudRow) {
      const lastSeen = nextMeta.remoteUpdatedAt[key];
      const remoteChanged = !lastSeen || cloudRow.updated_at > lastSeen;
      const locallyDirty = Boolean(nextMeta.dirtyAt[key]);
      if (remoteChanged && (!locallyDirty || cloudRow.updated_at > nextMeta.dirtyAt[key])) {
        active = rowToSession(cloudRow); // LWW: cloud newer
        delete nextMeta.dirtyAt[key];
      } else if (locallyDirty) {
        pushKeys.add(key); // LWW: local newer
      }
      nextMeta.remoteUpdatedAt[key] = cloudRow.updated_at;
    } else if (nextMeta.remoteUpdatedAt[key]) {
      // previously synced active session vanished remotely (discarded elsewhere)
      active = null;
      delete nextMeta.shadows[key];
      delete nextMeta.remoteUpdatedAt[key];
      delete nextMeta.dirtyAt[key];
    } else {
      pushKeys.add(key); // never synced → push
    }
  } else if (cloudActive && !nextMeta.pendingDeletes.includes(sessionKey(cloudActive.id))) {
    active = rowToSession(cloudActive); // adopt cloud active on this device
  }
  if (active) {
    const key = sessionKey(active.id);
    if (!pushKeys.has(key)) {
      nextMeta.shadows[key] = serializeSession(active);
    }
  }

  // ---------- daily logs ----------
  const dailyLogs: AppState["dailyLogs"] = { ...local.dailyLogs };
  const cloudLogByDate = new Map(cloudLogs.map((r) => [r.date, r]));
  for (const row of cloudLogs) {
    const key = dailyKey(row.date);
    const localLog = local.dailyLogs[row.date];
    const lastSeen = nextMeta.remoteUpdatedAt[key];
    const remoteChanged = !lastSeen || row.updated_at > lastSeen;
    const locallyDirty = Boolean(nextMeta.dirtyAt[key]);
    if (!localLog || (remoteChanged && (!locallyDirty || row.updated_at > nextMeta.dirtyAt[key]))) {
      dailyLogs[row.date] = rowToDailyLog(row);
      delete nextMeta.dirtyAt[key];
      nextMeta.shadows[key] = JSON.stringify(dailyLogs[row.date]);
    } else if (locallyDirty) {
      pushKeys.add(key);
    }
    nextMeta.remoteUpdatedAt[key] = row.updated_at;
  }
  for (const [date, log] of Object.entries(local.dailyLogs)) {
    const key = dailyKey(date);
    if (!cloudLogByDate.has(date)) {
      if (nextMeta.remoteUpdatedAt[key]) {
        delete dailyLogs[date]; // deleted remotely
        delete nextMeta.shadows[key];
        delete nextMeta.remoteUpdatedAt[key];
        delete nextMeta.dirtyAt[key];
      } else {
        pushKeys.add(key); // never synced → push (migration)
        void log;
      }
    }
  }

  const state: AppState = {
    ...local,
    activeSession: active,
    completedSessions: completed,
    dailyLogs,
  };
  return { state, meta: nextMeta, pushKeys: [...pushKeys] };
}
