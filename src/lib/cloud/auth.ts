"use client";

// Supabase email/password auth with a tiny observable state so React can
// subscribe via useSyncExternalStore. The security boundary is RLS — the
// browser only ever holds the publishable key + the user's own session.

import { useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "../supabase";

export type AuthStatus = "loading" | "signedOut" | "signedIn" | "unconfigured";

export interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
}

let state: AuthState = { status: "loading", userId: null, email: null };
let initialized = false;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!isSupabaseConfigured()) {
    setState({ status: "unconfigured", userId: null, email: null });
    return;
  }
  const supabase = getSupabase()!;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      const user = data.session?.user ?? null;
      setState(
        user
          ? { status: "signedIn", userId: user.id, email: user.email ?? null }
          : { status: "signedOut", userId: null, email: null },
      );
    })
    .catch(() => setState({ status: "signedOut", userId: null, email: null }));

  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    setState(
      user
        ? { status: "signedIn", userId: user.id, email: user.email ?? null }
        : { status: "signedOut", userId: null, email: null },
    );
  });
}

function subscribe(listener: () => void): () => void {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_STATE: AuthState = { status: "loading", userId: null, email: null };

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

export function getAuthState(): AuthState {
  init();
  return state;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Supabase is not configured.";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signUp(email: string, password: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Supabase is not configured.";
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return error.message;
  // autoconfirm is enabled on the project, so a session is returned directly
  if (!data.session) return "Account created — now sign in.";
  return null;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}
