"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Read-only Coach API (Supabase Edge Function). Tokens are generated client-side;
// only the SHA-256 hex of the plaintext ever reaches the database.
const COACH_API_BASE = "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read";
const CURL_EXAMPLE = `curl -H "Authorization: Bearer <YOUR_TOKEN>" "${COACH_API_BASE}/today"`;
const ROUTES =
  "/today · /day?date=YYYY-MM-DD · /week · /exercise-history?exerciseId=clean-strict-press · /recent-notes";

type TokenRow = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function shortDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CopyButton({ text, ariaLabel }: { text: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {
            /* clipboard unavailable — text stays selectable */
          });
      }}
      className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-line bg-raised px-4 font-display text-sm font-semibold text-hi active:scale-[0.97]"
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

/**
 * Power-user section (rendered below AccountSection on Progress): personal
 * access tokens for the read-only Coach API. Collapsed by default.
 */
export function CoachAccessSection() {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);

  const loadTokens = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error: err } = await sb
      .from("coach_tokens")
      .select("id,name,created_at,last_used_at,revoked_at")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setTokens(data);
  };

  const toggle = () => {
    if (open) {
      setReveal(null); // one-time reveal dies with the disclosure
    } else {
      void loadTokens(); // fetch on expand
    }
    setOpen(!open);
  };

  const generate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sb = getSupabase();
    const trimmed = name.trim();
    if (!sb || busy || !trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = `lnm_${base64url(bytes)}`;
      const hash = await sha256Hex(token);
      const { error: err } = await sb
        .from("coach_tokens")
        .insert({ name: trimmed, token_hash: hash });
      if (err) {
        setError(err.message);
        return;
      }
      setReveal(token);
      setName("");
      await loadTokens();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (t: TokenRow) => {
    const sb = getSupabase();
    if (!sb) return;
    if (!window.confirm(`Revoke "${t.name}"? Any coach using it loses access immediately.`)) {
      return;
    }
    setError(null);
    const { error: err } = await sb
      .from("coach_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", t.id);
    if (err) {
      setError(err.message);
      return;
    }
    await loadTokens();
  };

  if (!getSupabase()) {
    return (
      <section
        className="mt-3 rounded-2xl border border-line bg-surface p-4"
        aria-label="Coach API access"
      >
        <p className="label">COACH API ACCESS</p>
        <p className="mt-1 text-sm text-low">Cloud connection not configured.</p>
      </section>
    );
  }

  return (
    <section
      className="mt-3 rounded-2xl border border-line bg-surface"
      aria-label="Coach API access"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="label flex min-h-12 w-full items-center justify-between px-4 py-3 text-left active:scale-[0.99]"
      >
        COACH API ACCESS
        <Chevron open={open} />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          <p className="text-sm text-mid">
            Personal access tokens let an AI coach (e.g. ChatGPT) read your training data.
            Read-only.
          </p>

          {error && <p className="text-sm text-danger">{error}</p>}

          {tokens === null ? (
            <p className="text-sm text-low">Loading tokens…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-low">No tokens yet.</p>
          ) : (
            <ul>
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base text-hi">{t.name}</p>
                    <p className="text-xs text-low tnum">
                      Created {shortDate(t.created_at)} · Last used{" "}
                      {t.last_used_at ? shortDate(t.last_used_at) : "never"}
                    </p>
                  </div>
                  {t.revoked_at ? (
                    <span className="label shrink-0 text-danger">REVOKED</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void revoke(t)}
                      className="h-11 shrink-0 rounded-xl border border-line px-4 font-display text-sm font-semibold text-danger active:scale-[0.97]"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {reveal && (
            <div className="space-y-2">
              <p className="label text-volt">NEW TOKEN — SHOWN ONCE</p>
              <p className="select-all break-all rounded-xl border border-volt/40 bg-raised p-3 font-mono text-sm text-hi">
                {reveal}
              </p>
              <div className="flex gap-2">
                <CopyButton text={reveal} ariaLabel="Copy token" />
                <button
                  type="button"
                  onClick={() => setReveal(null)}
                  className="h-11 rounded-xl border border-line px-4 font-display text-sm font-semibold text-mid active:scale-[0.97]"
                >
                  DONE
                </button>
              </div>
              <p className="text-xs text-mid">
                This token is shown only once. Store it now — it cannot be recovered, only
                revoked.
              </p>
            </div>
          )}

          <form onSubmit={(e) => void generate(e)} className="space-y-2">
            <label htmlFor="coach-token-name" className="label block">
              Token name
            </label>
            <div className="flex gap-2">
              <input
                id="coach-token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ChatGPT"
                maxLength={60}
                required
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 text-base text-hi placeholder:text-low"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-12 shrink-0 rounded-xl bg-volt px-4 font-display text-base font-semibold text-onvolt active:scale-[0.97] disabled:opacity-50"
              >
                GENERATE TOKEN
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="label">HOW TO USE</p>
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-line bg-raised p-3 font-mono text-xs text-mid">
                {CURL_EXAMPLE}
              </pre>
              <CopyButton text={CURL_EXAMPLE} ariaLabel="Copy curl example" />
            </div>
            <p className="break-all text-xs text-low">Routes: {ROUTES}</p>
          </div>
        </div>
      )}
    </section>
  );
}
