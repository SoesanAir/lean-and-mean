"use client";

// Screen Wake Lock — keep the display awake WHILE a timed workout runs, so JS
// timers keep firing and every-minute/transition beeps actually happen on
// iPhone (a locked screen freezes timers and suspends audio). This is the
// music-safe alternative to a silent keep-alive stream: it touches only the
// screen, never audio. Auto-reacquired on visibility, released when idle.

type SentinelLike = { released: boolean; release: () => Promise<void> };

let sentinel: SentinelLike | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  if (typeof navigator === "undefined") return;
  const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<SentinelLike> } }).wakeLock;
  if (!wl) return; // unsupported (older iOS) — timers still run while the screen is on
  try {
    if (sentinel && !sentinel.released) return;
    sentinel = await wl.request("screen");
    sentinel.release = sentinel.release.bind(sentinel);
  } catch {
    /* denied (e.g. low power) — nothing else we can do */
  }
}

export function requestWakeLock(): void {
  wanted = true;
  void acquire();
  if (typeof document !== "undefined" && !onVisibilityAttached) {
    document.addEventListener("visibilitychange", onVisibility);
    onVisibilityAttached = true;
  }
}

export function releaseWakeLock(): void {
  wanted = false;
  if (sentinel && !sentinel.released) void sentinel.release();
  sentinel = null;
}

let onVisibilityAttached = false;
function onVisibility() {
  if (wanted && document.visibilityState === "visible") void acquire();
}
