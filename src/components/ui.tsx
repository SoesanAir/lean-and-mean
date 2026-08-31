"use client";

import { useState } from "react";
import type { Emphasis, GripType, Intensity } from "@/lib/types";
import { EMPHASIS_DESCRIPTIONS, EMPHASIS_LABELS, GRIP_DEFINITIONS } from "@/lib/types";
import { cls } from "@/lib/util";

// ---------- IntensityChip ----------

const INTENSITY_STYLES: Record<Intensity, string> = {
  HARD: "bg-hard/15 text-hard",
  MEDIUM: "bg-med/15 text-med",
  LIGHT: "bg-lite/15 text-lite",
  REST: "bg-rest/15 text-rest",
};

export function IntensityChip({ intensity }: { intensity: Intensity }) {
  return (
    <span
      className={cls(
        "label inline-flex items-center rounded-lg px-2.5 py-1",
        INTENSITY_STYLES[intensity],
      )}
      style={{ color: undefined }}
    >
      {intensity}
    </span>
  );
}

// ---------- EmphasisBadge ----------

export function EmphasisBadge({ emphasis, prominent }: { emphasis: Emphasis; prominent?: boolean }) {
  return (
    <span
      title={EMPHASIS_DESCRIPTIONS[emphasis]}
      className={cls(
        "label inline-flex items-center rounded-lg border border-line px-2.5 py-1 text-hi",
        prominent && "border-volt/40 text-volt",
      )}
    >
      {EMPHASIS_LABELS[emphasis]}
    </span>
  );
}

// ---------- WeightDisplay ----------

export function WeightDisplay({ kg, size = "lg" }: { kg: number; size?: "lg" | "md" }) {
  return (
    <span className="flex items-baseline gap-1 text-volt">
      <span
        className={cls("font-display font-bold leading-none tnum", size === "lg" ? "text-[40px]" : "text-[28px]")}
      >
        {kg}
      </span>
      <span className={cls("font-display font-semibold", size === "lg" ? "text-lg" : "text-base")}>KG</span>
    </span>
  );
}

// ---------- GripBadge (tap → definition sheet) ----------

export function GripBadge({ grip, gripNotes }: { grip: GripType; gripNotes?: string }) {
  const [open, setOpen] = useState(false);
  const display = grip.replace(/_/g, "-");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Grip: ${display}. Tap for definition.`}
        className="label inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-raised px-2.5 text-hi active:scale-[0.97]"
      >
        GRIP: <span className="text-volt">{display}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${display} grip definition`}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border-t border-line bg-raised p-5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold">GRIP: {display}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="text-base leading-relaxed text-mid">{GRIP_DEFINITIONS[grip]}</p>
            {gripNotes && <p className="mt-3 text-base text-hi">{gripNotes}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- BlockWeightBanner (spec §13 — one weight per timed section) ----------

export function BlockWeightBanner({ kg, label }: { kg: number | null; label?: string }) {
  if (kg === null) return null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-volt/30 bg-volt/10 px-4 py-3">
      <span className="label text-volt">{label ?? "ENTIRE BLOCK"}</span>
      <WeightDisplay kg={kg} size="md" />
    </div>
  );
}

// ---------- Disclosure (WATCH FOR etc.) ----------

export function Disclosure({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cls(
          "flex min-h-11 w-full items-center justify-between px-3 py-2 text-left label active:scale-[0.99]",
          accent ? "text-volt" : "text-mid",
        )}
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          className={cls("h-5 w-5 transition-transform duration-200", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function CueList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((c) => (
        <li key={c} className="flex gap-2 text-[15px] leading-snug text-hi">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-volt" aria-hidden />
          {c}
        </li>
      ))}
    </ul>
  );
}

// ---------- Stepper ----------

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
}) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-raised text-hi active:scale-[0.95] disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="min-w-10 px-0.5 text-center font-display text-2xl font-semibold tnum">
        {value}
        {suffix && <span className="ml-0.5 text-sm text-mid">{suffix}</span>}
      </span>
      <button type="button" className={btn} aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

// ---------- CheckCircle (set completion, 48px thumb target) ----------

export function CheckCircle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        onToggle();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
      }}
      className={cls(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-[0.92]",
        checked ? "border-volt bg-volt text-onvolt" : "border-line bg-raised text-transparent",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 13l4 4L19 7" />
      </svg>
    </button>
  );
}

// ---------- SectionShell ----------

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cls("rounded-2xl border border-line bg-surface p-4", className)}>{children}</div>;
}
