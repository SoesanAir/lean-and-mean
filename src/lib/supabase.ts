// Lean & Mean — Supabase client (lazy, optional).
//
// The app is local-first (see docs/product-plan.md §2, decision 1): it must run
// fully without Supabase. This module therefore never throws when credentials
// are absent — it returns null and the caller falls back to local storage.
//
// Env vars (see .env.local.example):
//   NEXT_PUBLIC_SUPABASE_URL       — project URL, e.g. https://xyz.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  — anon/public API key

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;
let warned = false;

/** True when both Supabase env vars are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Lazily create (and memoize) the Supabase client.
 * Returns null — with a single console.warn — when the env vars are missing,
 * so the local-first app keeps working without any cloud configuration.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!warned) {
      warned = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — " +
          "running local-first without cloud sync. See docs/supabase-setup.md.",
      );
    }
    return null;
  }

  client = createClient<Database>(url, anonKey);
  return client;
}
