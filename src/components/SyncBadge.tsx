"use client";

import { retryNow, useSyncStatus } from "@/lib/cloud/sync";
import { cls } from "@/lib/util";

const LABELS: Record<string, { text: string; dot: string; tone: string }> = {
  restoring: { text: "Loading…", dot: "bg-lite", tone: "text-lite" },
  saving: { text: "Saving…", dot: "bg-volt animate-pulse", tone: "text-volt" },
  synced: { text: "Synced", dot: "bg-volt", tone: "text-mid" },
  offline: { text: "Offline", dot: "bg-med", tone: "text-med" },
  error: { text: "Sync failed — retry", dot: "bg-danger", tone: "text-danger" },
};

/** Small glanceable sync indicator (spec: know your data is safe mid-workout). */
export function SyncBadge() {
  const status = useSyncStatus();
  if (status === "off") return null;
  const l = LABELS[status];
  if (!l) return null;

  const clickable = status === "error" || status === "offline";
  return (
    <button
      type="button"
      onClick={clickable ? () => retryNow() : undefined}
      aria-live="polite"
      aria-label={`Sync status: ${l.text}`}
      className={cls(
        // bottom-right above the nav: never overlaps the sticky header chips
        "fixed right-3 z-40 flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 text-xs font-semibold backdrop-blur",
        l.tone,
        !clickable && "pointer-events-none",
      )}
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
    >
      <span className={cls("h-2 w-2 rounded-full", l.dot)} aria-hidden />
      {l.text}
    </button>
  );
}
