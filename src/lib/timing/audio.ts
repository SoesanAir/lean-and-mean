"use client";

// Timer cue audio — deliberately additive to whatever the phone is playing.
//
// Hard requirement: cues must NEVER pause/duck/replace Apple Music/Spotify.
// Implementation choices that make that true:
//  - Web Audio API oscillators only — no <audio>/<video> elements, so the
//    page never registers as a media player / takes Media Session focus.
//  - On iOS Safari 17+, navigator.audioSession.type = "ambient" explicitly
//    requests MIX-WITH-OTHERS semantics for the page's audio session.
//  - No persistent/silent stream: the AudioContext only renders during the
//    ~0.1–0.7 s of each cue.
//  - Arm/unlock happens once, from the user's Start tap, with a zero-gain
//    blip (inaudible, does not disturb playing music).
//
// Sound vocabulary (small on purpose): countdown beep (×3 identical), GO
// (clearly longer + higher), REST (descending pair), END/DONE (falling
// three-note — unmistakably not GO), warn (double beep), tick (soft warm-up
// transition).

import type { CueSound } from "./engine";

const SOUND_KEY = "lean-and-mean/sound";

let ctx: AudioContext | null = null;
let enabled: boolean | undefined; // lazy-loaded preference
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  if (enabled === undefined) {
    try {
      enabled = window.localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      enabled = true;
    }
  }
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeSound(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

interface AudioSessionLike {
  type: string;
}

/**
 * Arm audio from an explicit user gesture (Start). Safe to call repeatedly.
 * Must never disturb currently playing music: ambient session + silent blip.
 */
export function armAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const nav = navigator as Navigator & { audioSession?: AudioSessionLike };
    if (nav.audioSession) nav.audioSession.type = "ambient"; // iOS: mix with music
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    // inaudible unlock blip (gain 0)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch {
    /* audio unavailable — visual/haptic cues still work */
  }
}

function tone(freq: number, startInSec: number, durSec: number, volume = 0.5, type: OscillatorType = "square") {
  if (!ctx) return;
  const t0 = ctx.currentTime + startInSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.setValueAtTime(volume, t0 + durSec - 0.03);
  gain.gain.linearRampToValueAtTime(0, t0 + durSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.01);
}

/** iOS suspends the context on interruptions — nudge it back before a cue */
export function resumeAudio(): void {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function playCue(sound: CueSound): void {
  if (!isSoundEnabled()) return;
  if (ctx && ctx.state === "suspended") void ctx.resume();
  if (!ctx || ctx.state !== "running") {
    // not armed yet (or resume hasn't landed) — haptic fallback only
    vibrateFor(sound);
    return;
  }
  switch (sound) {
    case "beep": // 3-2-1: same short beep every time
      tone(880, 0, 0.12);
      break;
    case "go": // clearly different: higher + much longer
      tone(1318, 0, 0.45, 0.6);
      break;
    case "rest": // descending pair
      tone(660, 0, 0.14, 0.5);
      tone(440, 0.16, 0.2, 0.5);
      break;
    case "end": // falling three-note — not GO, not a beep
      tone(784, 0, 0.18, 0.6);
      tone(587, 0.2, 0.18, 0.6);
      tone(392, 0.4, 0.34, 0.6);
      break;
    case "warn": // double beep
      tone(880, 0, 0.1);
      tone(880, 0.15, 0.1);
      break;
    case "tick": // soft warm-up transition
      tone(660, 0, 0.08, 0.25, "sine");
      break;
  }
  vibrateFor(sound);
}

function vibrateFor(sound: CueSound): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns: Record<CueSound, number | number[]> = {
    beep: 30,
    go: [80, 40, 80],
    rest: 60,
    end: [120, 60, 120, 60, 200],
    warn: [40, 40, 40],
    tick: 15,
  };
  navigator.vibrate?.(patterns[sound]);
}
