"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NoteField } from "@/components/NoteField";
import { Card } from "@/components/ui";
import type { MealType } from "@/lib/food";
import {
  addFoodEntry,
  deleteFoodEntry,
  ensureSession,
  getPhotoUrl,
  listFoodEntries,
} from "@/lib/food";
import { sessionProgress } from "@/lib/session/progress";
import { setDailyNote, upsertDailyLog } from "@/lib/session/store";
import { useAppState } from "@/lib/session/useStore";
import type { DailyLog, Difficulty1to5, FoodEntry } from "@/lib/types";
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

// ---------- food photo log (Supabase-backed — the one cloud feature) ----------

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** ts for a new meal: now when logging today, else noon (local) of the shown date. */
function mealTimestamp(date: string, isToday: boolean): string {
  if (isToday) return new Date().toISOString();
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function parseIntOrUndefined(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function macroLine(proteinG: number | undefined, calories: number | undefined): string {
  return [
    proteinG !== undefined && `${proteinG} g protein`,
    calories !== undefined && `${calories.toLocaleString("en-US")} kcal`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Square photo thumbnail: signed URL fetched on mount, neutral placeholder otherwise. */
function PhotoThumb({ path, alt }: { path: string | undefined; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    getPhotoUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="h-18 w-18 shrink-0 overflow-hidden rounded-xl border border-line bg-raised">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL on a static export
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-low" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}

function AddMealForm({
  date,
  isToday,
  onSaved,
  onCancel,
}: {
  date: string;
  isToday: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // revoke the previous object URL whenever it's replaced (and on unmount)
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    e.target.value = ""; // allow re-picking the same file
  };

  const canSave = Boolean(file || description.trim());

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await addFoodEntry({
        file: file ?? undefined,
        description: description.trim() || undefined,
        proteinG: parseIntOrUndefined(protein),
        calories: parseIntOrUndefined(calories),
        mealType,
        ts: mealTimestamp(date, isToday),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving the meal failed.");
      setSaving(false);
    }
  };

  const pickBtn =
    "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-raised font-display text-base font-semibold text-hi active:scale-[0.97]";

  return (
    <Card className="space-y-3">
      <div className="flex gap-2">
        <label className={pickBtn}>
          <input type="file" accept="image/*" capture="environment" hidden onChange={handlePick} />
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-mid" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          TAKE PHOTO
        </label>
        <label className={pickBtn}>
          <input type="file" accept="image/*" hidden onChange={handlePick} />
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-mid" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          CHOOSE PHOTO
        </label>
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img
          src={previewUrl}
          alt="Selected meal photo"
          className="h-40 w-full rounded-xl border border-line object-cover"
        />
      )}

      <div>
        <label htmlFor="food-desc" className="label block">
          Description
        </label>
        <input
          id="food-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you eat?"
          autoComplete="off"
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-raised px-3 text-base text-hi placeholder:text-low"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="food-protein" className="label block">
            Protein <span className="normal-case text-low">(g)</span>
          </label>
          <input
            id="food-protein"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-line bg-raised px-3 text-base text-hi tnum"
          />
        </div>
        <div>
          <label htmlFor="food-calories" className="label block">
            Calories <span className="normal-case text-low">(kcal)</span>
          </label>
          <input
            id="food-calories"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-line bg-raised px-3 text-base text-hi tnum"
          />
        </div>
      </div>

      <div>
        <span className="label block">Meal</span>
        <div className="mt-1.5 grid grid-cols-4 gap-2" role="group" aria-label="Meal type">
          {MEAL_TYPES.map((mt) => {
            const selected = mealType === mt;
            return (
              <button
                key={mt}
                type="button"
                aria-pressed={selected}
                aria-label={`${mt}${selected ? " (tap to clear)" : ""}`}
                onClick={() => setMealType(selected ? undefined : mt)}
                className={cls(
                  "min-h-11 rounded-xl border px-1 text-xs font-semibold uppercase tracking-wide active:scale-[0.95]",
                  selected ? "border-volt bg-volt text-onvolt" : "border-line bg-raised text-mid",
                )}
              >
                {mt}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-12 flex-1 rounded-xl border border-line bg-raised font-display text-base font-semibold text-hi active:scale-[0.97] disabled:opacity-40"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="h-12 flex-[2] rounded-xl bg-volt font-display text-lg font-bold text-onvolt active:scale-[0.97] disabled:opacity-40"
        >
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>
    </Card>
  );
}

function FoodEntryCard({
  entry,
  onDelete,
}: {
  entry: FoodEntry;
  onDelete: (entry: FoodEntry) => void;
}) {
  const macros = macroLine(entry.proteinG, entry.calories);
  return (
    <Card className="flex gap-3 p-3">
      <PhotoThumb path={entry.photoPath} alt={entry.description || "Meal photo"} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-mid tnum">{formatTime(entry.timestamp)}</span>
          {entry.mealType && (
            <span className="label rounded-lg border border-line px-2 py-0.5">{entry.mealType}</span>
          )}
        </div>
        {entry.description && (
          <p className="mt-0.5 break-words text-base leading-snug text-hi">{entry.description}</p>
        )}
        {macros && <p className="mt-0.5 text-sm text-mid tnum">{macros}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDelete(entry)}
        aria-label="Delete meal"
        className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-xl text-mid active:scale-[0.95]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </Card>
  );
}

function FoodSection({ date, isToday }: { date: string; isToday: boolean }) {
  // remount per date so per-day state (entries, form, errors) resets cleanly
  return <FoodDay key={date} date={date} isToday={isToday} />;
}

function FoodDay({ date, isToday }: { date: string; isToday: boolean }) {
  // null = still checking; false = unconfigured or anonymous sign-in failed
  const [cloudOk, setCloudOk] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await ensureSession();
      if (cancelled) return;
      if (!userId) {
        setCloudOk(false);
        setLoading(false);
        return;
      }
      setCloudOk(true);
      try {
        const list = await listFoodEntries(date);
        if (!cancelled) setEntries(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Loading meals failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const refresh = async () => setEntries(await listFoodEntries(date));

  const handleSaved = async () => {
    setFormOpen(false);
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loading meals failed.");
    }
  };

  const handleDelete = async (entry: FoodEntry) => {
    if (!window.confirm("Delete this meal?")) return;
    setError(null);
    try {
      await deleteFoodEntry(entry.id, entry.photoPath);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deleting the meal failed.");
    }
  };

  const totals = macroLine(
    entries.some((e) => e.proteinG !== undefined)
      ? entries.reduce((sum, e) => sum + (e.proteinG ?? 0), 0)
      : undefined,
    entries.some((e) => e.calories !== undefined)
      ? entries.reduce((sum, e) => sum + (e.calories ?? 0), 0)
      : undefined,
  );

  return (
    <section className="space-y-3" aria-label="Food log">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="label">Food</h2>
        {totals && <span className="text-sm text-mid tnum">{totals}</span>}
      </div>

      {cloudOk === false ? (
        <Card>
          <p className="text-sm text-mid">
            Food photos need the cloud connection — check .env.local.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm leading-snug text-low">
            Photo + description of every meal — you&apos;ll share these with ChatGPT later to
            assess macros.
          </p>

          {entries.map((entry) => (
            <FoodEntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}

          {loading && <p className="text-sm text-low">Loading meals…</p>}
          {!loading && cloudOk && entries.length === 0 && (
            <p className="text-sm text-low">No meals logged yet.</p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}

          {formOpen ? (
            <AddMealForm
              date={date}
              isToday={isToday}
              onSaved={handleSaved}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            cloudOk === true && (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="h-12 w-full rounded-xl bg-volt font-display text-lg font-bold text-onvolt active:scale-[0.97]"
              >
                + ADD MEAL
              </button>
            )
          )}
        </>
      )}
    </section>
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

        <FoodSection date={date} isToday={isToday} />
      </main>
    </div>
  );
}
