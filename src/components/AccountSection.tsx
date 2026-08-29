"use client";

import { signOut, useAuth } from "@/lib/cloud/auth";

/** Signed-in identity + sign out (rendered at the bottom of Progress). */
export function AccountSection() {
  const auth = useAuth();
  if (auth.status !== "signedIn") return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4" aria-label="Account">
      <p className="label">SIGNED IN AS</p>
      <p className="mt-0.5 truncate text-base text-hi">{auth.email ?? auth.userId}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 h-12 w-full rounded-xl border border-line font-display text-base font-semibold text-mid active:scale-[0.98]"
      >
        SIGN OUT
      </button>
      <p className="mt-2 text-xs text-low">
        Workouts and daily logs sync to Supabase; this device keeps an offline copy.
      </p>
    </section>
  );
}
