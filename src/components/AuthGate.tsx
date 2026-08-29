"use client";

import { useEffect, useState } from "react";
import { signIn, signUp, useAuth } from "@/lib/cloud/auth";
import { startSync, stopSync } from "@/lib/cloud/sync";
import { cls } from "@/lib/util";

/**
 * Gates the whole app behind Supabase email/password auth and runs the cloud
 * sync engine for the signed-in user. Friendly loading state while the
 * session is restored; no data renders for signed-out visitors.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "signedIn" && auth.userId) {
      void startSync(auth.userId);
      return () => stopSync();
    }
  }, [auth.status, auth.userId]);

  if (auth.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="text-center">
          <p className="font-display text-3xl font-bold text-volt">LEAN &amp; MEAN</p>
          <p className="label mt-2 animate-pulse">RESTORING SESSION…</p>
        </div>
      </main>
    );
  }

  if (auth.status === "unconfigured") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <p className="text-center text-mid">
          Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then rebuild.
        </p>
      </main>
    );
  }

  if (auth.status === "signedOut") {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (mode: "in" | "up") => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const err = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err === "Account created — now sign in.") setNotice(err);
    else if (err) setError(err);
    // on success onAuthStateChange flips the gate
  };

  const input =
    "h-12 w-full rounded-xl border border-line bg-raised px-3 text-base text-hi placeholder:text-low";

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mb-2 text-center">
        <h1 className="font-display text-4xl font-bold">
          LEAN <span className="text-volt">&amp;</span> MEAN
        </h1>
        <p className="label mt-1">TRAINING COCKPIT</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("in");
        }}
      >
        <div>
          <label htmlFor="auth-email" className="label mb-1 block">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            required
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="label mb-1 block">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-volt">{notice}</p>}

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="h-14 w-full rounded-xl bg-volt font-display text-xl font-bold tracking-wide text-onvolt active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "…" : "SIGN IN"}
        </button>
        <button
          type="button"
          disabled={busy || !email || !password}
          onClick={() => void submit("up")}
          className={cls(
            "h-12 w-full rounded-xl border border-line font-display text-base font-semibold text-mid active:scale-[0.98] disabled:opacity-40",
          )}
        >
          CREATE ACCOUNT
        </button>
      </form>

      <p className="text-center text-xs text-low">
        Your training data is private — protected per account by row-level security.
      </p>
    </main>
  );
}
