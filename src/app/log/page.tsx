"use client";

import Link from "next/link";
import { useState } from "react";
import { NoteField } from "@/components/NoteField";
import { Card } from "@/components/ui";
import { sessionProgress } from "@/lib/session/progress";
import { setDailyNote, upsertDailyLog } from "@/lib/session/store";
import { useAppState } from "@/lib/session/useStore";
import type { DailyLog, Difficulty1to5 } from "@/lib/types";
import { cls, todayISO } from "@/lib/util";

// ---------- date helpers (pure YYYY-MM-DD string math, UTC-safe) ----------

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .toUpperCase();
}

// ---------- numeric field (all optional, autosaves on change) ----------

function NumberField({
  id,
  label,
  unit,
  mode,
  value,
  onSave,
}: {
  id: string;
  label: string;
  unit: string;
  mode: "decimal" | "numeric";
  value: number | undefined;
  onSave: (v: number | undefined) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <label htmlFor={id} className="label block">
        {label} <span className="normal-case text-low">({unit})</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode={mode}
        autoComplete="off"
        defaultValue={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value.trim().replace(",", ".");
          if (raw === "") {
            onSave(undefined);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onSave(n);
        }}
        className="mt-1.5 h-11 w-full rounded-lg border border-line bg-raised px-3 text-base text-hi tnum"
      />
    </div>
  );
}

// ---------- 1–5 segmented scale (tap selected again to clear) ----------

const SCALE: Difficulty1to5[] = [1, 2, 3, 4, 5];

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Difficulty1to5 | undefined;
  onChange: (v: Difficulty1to5 | undefined) => void;
}) {
  return (
    <Card>
      <span className="label block">{label}</span>
      <div className="mt-2 flex gap-2" role="group" aria-label={label}>
        {SCALE.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${n}${selected ? " (tap to clear)" : ""}`}
              onClick={() => onChange(selected ? undefined : n)}
              className={cls(
                "min-h-11 flex-1 rounded-xl border font-display text-xl font-semibold tnum active:scale-[0.95]",
                selected
                  ? "border-volt bg-volt text-onvolt"
                  : "border-line bg-raised text-hi",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- page ----------

export default function LogPage() {
  const state = useAppState();
  const [date, setDate] = useState(todayISO);

  const log: DailyLog | undefined = state.dailyLogs[date];
  const isToday = date === todayISO();
  const sessions = state.completedSessions.filter((s) => s.date === date);

  const chevron =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-hi active:scale-[0.95] disabled:opacity-40";

  return (
    <div className="px-4 pt-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-wide">DAILY LOG</h1>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className={chevron}
            aria-label="Previous day"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="text-center" suppressHydrationWarning>
            <div className="font-display text-2xl font-semibold leading-tight">
              {formatDate(date)}
            </div>
            {isToday && <div className="label text-volt">Today</div>}
          </div>
          <button
            type="button"
            className={chevron}
            aria-label="Next day"
            disabled={isToday}
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </header>

      <main className="mt-4 space-y-3">
        {sessions.map((s) => {
          const p = sessionProgress(s);
          return (
            <Link
              key={s.id}
              href={`/history?id=${s.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 active:scale-[0.98]"
            >
              <div className="min-w-0">
                <div className="label text-volt">Workout completed</div>
                <div className="truncate font-display text-xl font-semibold">
                  DAY {s.day} — {s.snapshot.name}
                </div>
              </div>
              <span className="shrink-0 font-display text-2xl font-bold text-volt tnum">
                {p.percent}%
              </span>
            </Link>
          );
        })}

        {/* remount inputs when the date changes so defaultValue re-reads the log */}
        <div key={date} className="grid grid-cols-2 gap-3">
          <NumberField
            id="weight"
            label="Body weight"
            unit="kg"
            mode="decimal"
            value={log?.weightKg}
            onSave={(v) => upsertDailyLog(date, { weightKg: v })}
          />
          <NumberField
            id="waist"
            label="Waist"
            unit="cm"
            mode="decimal"
            value={log?.waistCm}
            onSave={(v) => upsertDailyLog(date, { waistCm: v })}
          />
          <NumberField
            id="steps"
            label="Steps"
            unit="count"
            mode="numeric"
            value={log?.steps}
            onSave={(v) => upsertDailyLog(date, { steps: v === undefined ? undefined : Math.round(v) })}
          />
          <NumberField
            id="sleep"
            label="Sleep"
            unit="hours"
            mode="decimal"
            value={log?.sleepHours}
            onSave={(v) => upsertDailyLog(date, { sleepHours: v })}
          />
          <NumberField
            id="protein"
            label="Protein"
            unit="g"
            mode="numeric"
            value={log?.proteinG}
            onSave={(v) => upsertDailyLog(date, { proteinG: v === undefined ? undefined : Math.round(v) })}
          />
          <NumberField
            id="calories"
            label="Calories"
            unit="kcal"
            mode="numeric"
            value={log?.calories}
            onSave={(v) => upsertDailyLog(date, { calories: v === undefined ? undefined : Math.round(v) })}
          />
        </div>

        <ScaleRow
          label="Energy"
          value={log?.energy}
          onChange={(v) => upsertDailyLog(date, { energy: v })}
        />
        <ScaleRow
          label="Soreness"
          value={log?.soreness}
          onChange={(v) => upsertDailyLog(date, { soreness: v })}
        />

        <Card>
          <span className="label block">Daily note</span>
          <div className="mt-1">
            <NoteField
              key={`note-${date}`}
              note={log?.note}
              onSave={(text) => setDailyNote(date, text)}
              placeholder="Anything worth remembering…"
            />
          </div>
        </Card>
      </main>
    </div>
  );
}
