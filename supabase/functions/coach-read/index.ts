// coach-read — read-only Coach API (V1), deployed as a Supabase Edge Function.
//
// Auth: personal access token "lnm_<base64url>" in the Authorization header.
// Only the SHA-256 of the token is stored (public.coach_tokens); the function
// resolves the owning user from the digest and scopes EVERY query to that
// user_id. The service-role key is used only inside this server-side runtime
// (auto-injected env var) and bypasses RLS — which is why explicit user_id
// scoping below is mandatory on every request.
//
// Routes (GET only):
//   /coach-read/today[?tz=Asia/Jerusalem]
//   /coach-read/day?date=YYYY-MM-DD
//   /coach-read/week[?date=YYYY-MM-DD][&tz=...]
//   /coach-read/exercise-history?exerciseId=<id>[&limit=20]
//   /coach-read/recent-notes[?limit=20]
//
// Data interpretation is shared with the app via ../../src/lib (bundled):
// sessions are read from their immutable prescription_snapshot + performance.

import {
  collectNotes,
  exerciseHistory,
  shapeDailyLog,
  shapeSessionDetail,
  weekView,
} from "../../../src/lib/coach/shape.ts";
import { rowToDailyLog, rowToSession } from "../../../src/lib/cloud/mapping.ts";
import type { DailyLogRow, SessionRow } from "../../../src/lib/cloud/mapping.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(h: (req: Request) => Promise<Response> | Response): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_TZ = "Asia/Jerusalem";
const MAX_LIMIT = 100;
const VERSION = "v1";

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: BASE_HEADERS });
}

function ok(data: unknown): Response {
  return json(200, { version: VERSION, generatedAt: new Date().toISOString(), data });
}

function fail(status: number, code: string, message: string): Response {
  return json(status, { version: VERSION, error: { code, message } });
}

// ---------- PostgREST (service role, always user-scoped) ----------

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`rest ${res.status}`);
  return (await res.json()) as T;
}

function restWrite(path: string, method: string, body: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// ---------- auth: resolve user from PAT ----------

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface TokenRow {
  id: string;
  user_id: string;
  revoked_at: string | null;
  scopes: string[];
}

async function resolveUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(lnm_[A-Za-z0-9_-]{20,200})$/);
  if (!match) return null;
  const hash = await sha256Hex(match[1]);
  const rows = await rest<TokenRow[]>(
    `coach_tokens?token_hash=eq.${hash}&select=id,user_id,revoked_at,scopes&limit=1`,
  );
  const row = rows[0];
  if (!row || row.revoked_at || !row.scopes.includes("coach:read")) return null;
  // best-effort last_used_at; never block or fail the request on it
  restWrite(`coach_tokens?id=eq.${row.id}`, "PATCH", { last_used_at: new Date().toISOString() }).catch(
    () => {},
  );
  return row.user_id;
}

// ---------- date helpers ----------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIn(tz: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

function validTz(tz: string | null): string | null {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

function weekDates(date: string): string[] {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

function parseLimit(url: URL, fallback: number): number {
  const raw = url.searchParams.get("limit");
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, MAX_LIMIT);
}

// ---------- user-scoped data fetchers ----------

const SESSION_COLS = "*";

async function sessionsWhere(userId: string, filter: string, limit: number): Promise<SessionRow[]> {
  return rest<SessionRow[]>(
    `workout_sessions?user_id=eq.${userId}${filter}&select=${SESSION_COLS}&order=started_at.desc&limit=${limit}`,
  );
}

async function logsWhere(userId: string, filter: string, limit: number): Promise<DailyLogRow[]> {
  return rest<DailyLogRow[]>(
    `daily_logs?user_id=eq.${userId}${filter}&select=*&order=date.desc&limit=${limit}`,
  );
}

// ---------- route handlers ----------

async function handleDay(userId: string, date: string) {
  const [sessions, logs] = await Promise.all([
    sessionsWhere(userId, `&date=eq.${date}`, 10),
    logsWhere(userId, `&date=eq.${date}`, 1),
  ]);
  return ok({
    date,
    sessions: sessions.map((r) => shapeSessionDetail(rowToSession(r))),
    dailyLog: logs[0] ? shapeDailyLog(rowToDailyLog(logs[0])) : null,
  });
}

async function handleWeek(userId: string, date: string) {
  const dates = weekDates(date);
  const [sessions, logs] = await Promise.all([
    sessionsWhere(userId, `&date=gte.${dates[0]}&date=lte.${dates[6]}`, 30),
    logsWhere(userId, `&date=gte.${dates[0]}&date=lte.${dates[6]}`, 7),
  ]);
  return ok(
    weekView(sessions.map(rowToSession), logs.map(rowToDailyLog), dates[0], dates),
  );
}

async function handleExerciseHistory(userId: string, exerciseId: string, limit: number) {
  const sessions = await sessionsWhere(userId, "", 100);
  return ok({
    exerciseId,
    entries: exerciseHistory(sessions.map(rowToSession), exerciseId, limit),
  });
}

async function handleRecentNotes(userId: string, limit: number) {
  const [sessions, logs] = await Promise.all([
    sessionsWhere(userId, "", 60),
    logsWhere(userId, "", 60),
  ]);
  return ok({
    notes: collectNotes(sessions.map(rowToSession), logs.map(rowToDailyLog), limit),
  });
}

// ---------- entry ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: BASE_HEADERS });
  if (req.method !== "GET") return fail(405, "method_not_allowed", "This API is read-only (GET).");

  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/coach-read/, "").replace(/\/+$/, "") || "/";

  let userId: string | null = null;
  try {
    userId = await resolveUser(req);
  } catch {
    return fail(500, "internal", "Temporary failure — try again.");
  }
  if (!userId) return fail(401, "unauthorized", "Invalid, revoked or missing token.");

  const tz = validTz(url.searchParams.get("tz"));
  if (!tz) return fail(400, "bad_request", "Unknown tz parameter.");

  try {
    switch (route) {
      case "/today":
        return await handleDay(userId, todayIn(tz));
      case "/day": {
        const date = url.searchParams.get("date");
        if (!date || !DATE_RE.test(date)) {
          return fail(400, "bad_request", "date=YYYY-MM-DD is required.");
        }
        return await handleDay(userId, date);
      }
      case "/week": {
        const date = url.searchParams.get("date") ?? todayIn(tz);
        if (!DATE_RE.test(date)) return fail(400, "bad_request", "date must be YYYY-MM-DD.");
        return await handleWeek(userId, date);
      }
      case "/exercise-history": {
        const exerciseId = url.searchParams.get("exerciseId");
        if (!exerciseId || !/^[a-z0-9-]{1,60}$/.test(exerciseId)) {
          return fail(400, "bad_request", "exerciseId is required (stable slug, e.g. clean-strict-press).");
        }
        return await handleExerciseHistory(userId, exerciseId, parseLimit(url, 20));
      }
      case "/recent-notes":
        return await handleRecentNotes(userId, parseLimit(url, 20));
      default:
        return fail(404, "not_found", "Routes: /today /day /week /exercise-history /recent-notes");
    }
  } catch {
    // never leak internal DB errors to callers
    return fail(500, "internal", "Temporary failure — try again.");
  }
});
