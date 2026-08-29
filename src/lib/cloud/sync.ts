"use client";

// Cloud sync engine: Supabase is the source of truth, localStorage is the
// offline cache / unsynced working copy. UI writes stay instant (synchronous
// local store); this module pushes changes in the background with debounce,
// pulls + merges on start/visibility/online, and never drops dirty local
// edits on failure (they stay flagged and are retried).

import { useSyncExternalStore } from "react";
import { getSupabase } from "../supabase";
import {
  getState,
  replaceState,
  subscribe as subscribeStore,
  type AppState,
} from "../session/store";
import { nowISO } from "../util";
import { dailyLogToRow, sessionToRow } from "./mapping";
import { emptyMeta, localEntities, mergeCloud, type SyncMeta } from "./merge";

export type SyncStatus = "off" | "restoring" | "synced" | "saving" | "offline" | "error";

const META_KEY = "lean-and-mean/sync-v1";
const PUSH_DEBOUNCE_MS = 800;
const RETRY_MS = 12_000;
const PULL_THROTTLE_MS = 10_000;

let status: SyncStatus = "off";
let meta: SyncMeta = emptyMeta();
let running = false;
let applyingCloud = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let lastPullAt = 0;
let unsubscribeStore: (() => void) | null = null;

const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => "off" as SyncStatus,
  );
}

function loadMeta(): SyncMeta {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (raw) return { ...emptyMeta(), ...(JSON.parse(raw) as SyncMeta) };
  } catch {
    /* fall through */
  }
  return emptyMeta();
}

function saveMeta() {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* storage unavailable — meta stays in memory */
  }
}

// ---------------- local change detection ----------------

function detectChanges() {
  if (applyingCloud) return;
  const entities = localEntities(getState());
  let changed = false;
  for (const [key, json] of entities) {
    if (meta.shadows[key] !== json) {
      meta.dirtyAt[key] = nowISO();
      meta.shadows[key] = json;
      changed = true;
    }
  }
  for (const key of Object.keys(meta.shadows)) {
    if (!entities.has(key)) {
      // entity deleted locally; only unfinished sessions are ever deleted
      // (discarded workouts) — finished history and daily logs never are.
      delete meta.shadows[key];
      delete meta.dirtyAt[key];
      if (key.startsWith("s:") && meta.remoteUpdatedAt[key]) {
        meta.pendingDeletes.push(key);
      }
      delete meta.remoteUpdatedAt[key];
      changed = true;
    }
  }
  if (changed) {
    saveMeta();
    schedulePush();
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flush(), PUSH_DEBOUNCE_MS);
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void flush(), RETRY_MS);
}

// ---------------- push ----------------

function findSession(state: AppState, id: string) {
  if (state.activeSession?.id === id) return state.activeSession;
  return state.completedSessions.find((s) => s.id === id) ?? null;
}

async function flush(): Promise<void> {
  if (!running || flushing) return;
  const supabase = getSupabase();
  if (!supabase) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return; // 'online' listener will retry
  }

  const dirtyKeys = Object.keys(meta.dirtyAt);
  const deletes = [...meta.pendingDeletes];
  if (dirtyKeys.length === 0 && deletes.length === 0) {
    setStatus("synced");
    return;
  }

  flushing = true;
  setStatus("saving");
  let needPull = false;

  try {
    // deletions of discarded (unfinished) sessions — never delete finished rows
    for (const key of deletes) {
      const id = key.slice(2);
      const { error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", id)
        .is("finished_at", null);
      if (error) throw error;
      meta.pendingDeletes = meta.pendingDeletes.filter((k) => k !== key);
    }

    const state = getState();
    for (const key of Object.keys(meta.dirtyAt)) {
      const editedAt = meta.dirtyAt[key];
      if (key.startsWith("s:")) {
        const id = key.slice(2);
        const session = findSession(state, id);
        if (!session) {
          delete meta.dirtyAt[key];
          continue;
        }
        if (!session.finishedAt) {
          // active session: check we're not about to clobber newer remote state
          const { data: remote, error: readErr } = await supabase
            .from("workout_sessions")
            .select("finished_at, updated_at")
            .eq("id", id)
            .maybeSingle();
          if (readErr) throw readErr;
          if (remote?.finished_at || (remote && remote.updated_at > editedAt)) {
            delete meta.dirtyAt[key];
            needPull = true; // finished or advanced elsewhere — adopt cloud
            continue;
          }
        }
        const { error } = await supabase
          .from("workout_sessions")
          .upsert(sessionToRow(session, editedAt), { onConflict: "id" });
        if (error) {
          if (error.code === "23505") {
            // another active session exists in the cloud — cloud wins
            delete meta.dirtyAt[key];
            needPull = true;
            continue;
          }
          throw error;
        }
        meta.remoteUpdatedAt[key] = editedAt;
        delete meta.dirtyAt[key];
      } else if (key.startsWith("d:")) {
        const date = key.slice(2);
        const log = state.dailyLogs[date];
        if (!log) {
          delete meta.dirtyAt[key];
          continue;
        }
        const { error } = await supabase
          .from("daily_logs")
          .upsert(dailyLogToRow(log, editedAt), { onConflict: "user_id,date" });
        if (error) throw error;
        meta.remoteUpdatedAt[key] = editedAt;
        delete meta.dirtyAt[key];
      }
    }
    saveMeta();
    setStatus(Object.keys(meta.dirtyAt).length ? "saving" : "synced");
  } catch {
    saveMeta();
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    scheduleRetry();
  } finally {
    flushing = false;
  }

  if (needPull) await pullAndReconcile(true);
  if (Object.keys(meta.dirtyAt).length > 0 && status === "synced") schedulePush();
}

// ---------------- pull + merge ----------------

async function pullAndReconcile(force = false): Promise<void> {
  if (!running) return;
  const supabase = getSupabase();
  if (!supabase) return;
  if (!force && Date.now() - lastPullAt < PULL_THROTTLE_MS) return;
  lastPullAt = Date.now();

  try {
    const [sessions, logs] = await Promise.all([
      supabase.from("workout_sessions").select("*").order("started_at", { ascending: false }).limit(300),
      supabase.from("daily_logs").select("*").limit(400),
    ]);
    if (sessions.error) throw sessions.error;
    if (logs.error) throw logs.error;

    const result = mergeCloud(getState(), meta, sessions.data ?? [], logs.data ?? []);
    meta = result.meta;
    for (const key of result.pushKeys) {
      meta.dirtyAt[key] ??= nowISO();
    }
    saveMeta();

    applyingCloud = true;
    try {
      replaceState(result.state);
    } finally {
      applyingCloud = false;
    }

    if (result.pushKeys.length > 0) {
      await flush();
    } else {
      setStatus(Object.keys(meta.dirtyAt).length ? "saving" : "synced");
      if (Object.keys(meta.dirtyAt).length) schedulePush();
    }
  } catch {
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    scheduleRetry();
  }
}

// ---------------- lifecycle ----------------

function onOnline() {
  void flush();
  void pullAndReconcile();
}

function onVisibility() {
  if (document.visibilityState === "visible") void pullAndReconcile();
}

export async function startSync(userId: string): Promise<void> {
  if (running) return;
  running = true;
  meta = loadMeta();

  // Data safety: never show another user's data. A different account on this
  // device clears the local cache first. A first-ever sign-in keeps existing
  // local data — that is the legacy localStorage migration (it gets pushed).
  if (meta.lastUserId && meta.lastUserId !== userId) {
    applyingCloud = true;
    try {
      replaceState({
        version: 1,
        activeSession: null,
        completedSessions: [],
        dailyLogs: {},
        quoteOverrides: {},
      });
    } finally {
      applyingCloud = false;
    }
    meta = emptyMeta();
  }
  meta.lastUserId = userId;
  saveMeta();

  setStatus("restoring");
  unsubscribeStore = subscribeStore(detectChanges);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);

  await pullAndReconcile(true);
  detectChanges(); // pick up anything edited before sync started
}

export function stopSync(): void {
  running = false;
  setStatus("off");
  if (pushTimer) clearTimeout(pushTimer);
  if (retryTimer) clearTimeout(retryTimer);
  unsubscribeStore?.();
  unsubscribeStore = null;
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", onVisibility);
}

export function retryNow(): void {
  void flush();
  void pullAndReconcile(true);
}
