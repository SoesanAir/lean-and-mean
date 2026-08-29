"use client";

import Link from "next/link";
import { AccountSection } from "@/components/AccountSection";
import { CoachAccessSection } from "@/components/CoachAccessSection";
import { Card } from "@/components/ui";
import { sessionProgress } from "@/lib/session/progress";
import { useAppState } from "@/lib/session/useStore";
import type { TimedBlockResult, WorkoutSession } from "@/lib/types";
import { cls, todayISO } from "@/lib/util";

// ---------- date helpers ----------

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

// ---------- sparkline (single series, volt, no axes — stat-tile trend) ----------

function Sparkline({ values }: { values: number[] }) {
  const W = 200;
  const H = 48;
  const PAD = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (values.length - 1);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      {points.length > 1 && (
        <polyline
          points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-volt)" />
    </svg>
  );
}

const EMPTY_TREND = "No entries yet — log it once and the trend starts here.";

function TrendCard({
  title,
  unit,
  entries,
}: {
  title: string;
  unit: string;
  entries: Array<{ date: string; value: number }>;
}) {
  const last = entries[entries.length - 1];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="label">{title}</span>
        {last && (
          <span className="flex items-baseline gap-1 leading-none">
            <span className="font-display text-3xl font-bold tnum">{last.value}</span>
            <span className="text-sm text-mid">{unit}</span>
          </span>
        )}
      </div>
      {entries.length > 0 ? (
        <div className="mt-2">
          <Sparkline values={entries.map((e) => e.value)} />
          <div className="mt-1 flex justify-between text-xs text-low tnum">
            <span>{shortDate(entries[0].date)}</span>
            {entries.length > 1 && <span>{shortDate(last.date)}</span>}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-low">{EMPTY_TREND}</p>
      )}
    </Card>
  );
}

// ---------- history extraction (snapshot describes the plan, sections the result) ----------

function timedResultText(r: TimedBlockResult | undefined): string {
  if (!r) return "—";
  if (r.resultSummary) return r.resultSummary;
  if (r.completedRounds !== undefined) {
    return `${r.completedRounds} rounds${r.extraReps ? ` + ${r.extraReps} reps` : ""}`;
  }
  return "—";
}

function sectionResult(session: WorkoutSession, sectionId: string) {
  return session.sections.find((r) => r.sectionId === sectionId);
}

function liftHistory(sessions: WorkoutSession[], exerciseId: string) {
  const rows: Array<{ key: string; date: string; weightKg?: number; reps: string }> = [];
  for (const s of sessions) {
    for (const sec of s.snapshot.sections) {
      if (sec.type !== "STRAIGHT_SETS" && sec.type !== "CIRCUIT") continue;
      for (const p of sec.prescriptions) {
        if (p.exerciseId !== exerciseId) continue;
        const ex = sectionResult(s, sec.id)?.exercises?.find((e) => e.prescriptionId === p.id);
        const reps = ex?.sets.map((st) => st.actualReps ?? "–").join(" / ") ?? "–";
        rows.push({ key: `${s.id}-${p.id}`, date: s.date, weightKg: p.weightKg, reps });
      }
    }
  }
  return rows;
}

function HistoryRow({
  date,
  children,
  right,
}: {
  date: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
      <div className="min-w-0">
        <span className="text-xs text-low tnum">{shortDate(date)}</span>
        <div className="truncate text-[15px] text-hi">{children}</div>
      </div>
      {right !== undefined && (
        <span className="shrink-0 font-display text-xl font-semibold text-hi tnum">{right}</span>
      )}
    </li>
  );
}

function HistoryCard({
  title,
  empty,
  children,
  accent,
}: {
  title: string;
  empty?: string;
  children?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={cls(accent && "border-volt/40")}>
      <span className={cls("label block", accent && "text-volt")}>{title}</span>
      {children ?? <p className="mt-2 text-sm text-low">{empty}</p>}
    </Card>
  );
}

// ---------- page ----------

export default function ProgressPage() {
  const state = useAppState();
  const sessions = state.completedSessions; // newest first
  const chrono = [...sessions].reverse(); // oldest first for progression reading

  // -- streak: consecutive days ending today (or yesterday) with a finished session
  const finishedDates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  let cursor = todayISO();
  if (!finishedDates.has(cursor)) cursor = shiftDate(cursor, -1);
  while (finishedDates.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  const weekStart = mondayOf(todayISO());
  const thisWeek = sessions.filter((s) => s.date >= weekStart).length;

  // -- daily-log trends
  const logs = Object.values(state.dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
  const weightTrend = logs
    .filter((l) => l.weightKg !== undefined)
    .map((l) => ({ date: l.date, value: l.weightKg as number }));
  const waistTrend = logs
    .filter((l) => l.waistCm !== undefined)
    .map((l) => ({ date: l.date, value: l.waistCm as number }));

  // -- AMRAP benchmarks (the Week-1-vs-Week-10 anchor)
  const benchmarks = chrono.flatMap((s) =>
    s.snapshot.sections
      .filter((sec) => sec.type === "AMRAP" && sec.isBenchmark)
      .map((sec) => ({
        key: `${s.id}-${sec.id}`,
        date: s.date,
        title: sec.title,
        label: sec.type === "AMRAP" ? sec.benchmarkLabel : undefined,
        result: sectionResult(s, sec.id)?.timedBlock,
      })),
  );

  // -- EMOM history
  const emoms = chrono.flatMap((s) =>
    s.snapshot.sections
      .filter((sec) => sec.type === "EMOM")
      .map((sec) => ({
        key: `${s.id}-${sec.id}`,
        date: s.date,
        title: sec.title,
        minutes: sec.type === "EMOM" ? sec.minutes : 0,
        completed: sectionResult(s, sec.id)?.timedBlock?.completedMinutes,
      })),
  );

  // -- handstand history
  const handstands = chrono.flatMap((s) =>
    s.snapshot.sections
      .filter((sec) => sec.type === "SKILL" && sec.exerciseId === "handstand")
      .map((sec) => {
        const skill = sectionResult(s, sec.id)?.skill;
        return {
          key: `${s.id}-${sec.id}`,
          date: s.date,
          durationMin: skill?.actualDurationMin,
          bestHoldSec: skill?.bestHoldSec,
        };
      }),
  );

  const pushUps = liftHistory(chrono, "push-up");
  const hornCurls = liftHistory(chrono, "horn-curl");

  return (
    <div className="px-4 pt-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-wide">PROGRESS</h1>
      </header>

      <main className="mt-4 space-y-3">
        {/* headline stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="font-display text-5xl font-bold leading-none text-volt tnum">
              {streak}
            </div>
            <div className="label mt-1">day streak</div>
          </Card>
          <Card>
            <div className="font-display text-5xl font-bold leading-none tnum">
              {sessions.length}
            </div>
            <div className="label mt-1">
              workouts · <span className="text-hi tnum">{thisWeek}</span> this week
            </div>
          </Card>
        </div>

        <TrendCard title="Body weight" unit="kg" entries={weightTrend} />
        <TrendCard title="Waist" unit="cm" entries={waistTrend} />

        <HistoryCard
          title="Benchmark AMRAP"
          accent
          empty={benchmarks.length ? undefined : "No benchmark yet — Day 3 sets the Week-1 baseline."}
        >
          {benchmarks.length > 0 && (
            <ul className="mt-2">
              {benchmarks.map((b) => (
                <li key={b.key} className="border-t border-line py-2 first:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-low tnum">{shortDate(b.date)}</span>
                    <span className="font-display text-xl font-semibold text-volt tnum">
                      {timedResultText(b.result)}
                    </span>
                  </div>
                  <div className="text-[15px] text-hi">{b.title}</div>
                  {b.label && <div className="text-xs text-mid">{b.label}</div>}
                </li>
              ))}
            </ul>
          )}
        </HistoryCard>

        <HistoryCard
          title="EMOM"
          empty={emoms.length ? undefined : "No EMOM done yet — it shows up here once you finish one."}
        >
          {emoms.length > 0 && (
            <ul className="mt-2">
              {emoms.map((e) => (
                <HistoryRow
                  key={e.key}
                  date={e.date}
                  right={`${e.completed ?? 0}/${e.minutes} min`}
                >
                  {e.title}
                </HistoryRow>
              ))}
            </ul>
          )}
        </HistoryCard>

        <HistoryCard
          title="Handstand"
          empty={handstands.length ? undefined : "No handstand work yet — practice lands here."}
        >
          {handstands.length > 0 && (
            <ul className="mt-2">
              {handstands.map((h) => (
                <HistoryRow
                  key={h.key}
                  date={h.date}
                  right={h.bestHoldSec !== undefined ? `${h.bestHoldSec}s hold` : "—"}
                >
                  {h.durationMin !== undefined ? `${h.durationMin} min practice` : "Practice"}
                </HistoryRow>
              ))}
            </ul>
          )}
        </HistoryCard>

        <HistoryCard
          title="Push-ups"
          empty={pushUps.length ? undefined : "No push-up sets yet — reps per set will show here."}
        >
          {pushUps.length > 0 && (
            <ul className="mt-2">
              {pushUps.map((r) => (
                <HistoryRow key={r.key} date={r.date} right={r.reps}>
                  {r.weightKg !== undefined ? `${r.weightKg} kg` : "Bodyweight"}
                </HistoryRow>
              ))}
            </ul>
          )}
        </HistoryCard>

        <HistoryCard
          title="Horn curls"
          empty={hornCurls.length ? undefined : "No horn-curl sets yet — reps per set will show here."}
        >
          {hornCurls.length > 0 && (
            <ul className="mt-2">
              {hornCurls.map((r) => (
                <HistoryRow key={r.key} date={r.date} right={r.reps}>
                  {r.weightKg !== undefined ? `${r.weightKg} kg` : "Bodyweight"}
                </HistoryRow>
              ))}
            </ul>
          )}
        </HistoryCard>

        <section aria-label="Completed workouts">
          <h2 className="label px-1">Completed workouts</h2>
          <div className="mt-2 space-y-2">
            {sessions.length === 0 && (
              <Card>
                <p className="text-sm text-low">
                  Nothing finished yet — your first workout starts the story.
                </p>
              </Card>
            )}
            {sessions.map((s) => {
              const p = sessionProgress(s);
              return (
                <Link
                  key={s.id}
                  href={`/history?id=${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 active:scale-[0.98]"
                >
                  <div className="min-w-0">
                    <span className="text-xs text-low tnum">{shortDate(s.date)}</span>
                    <div className="truncate font-display text-lg font-semibold">
                      DAY {s.day} — {s.snapshot.name}
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-xl font-bold text-volt tnum">
                    {p.percent}%
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <AccountSection />
        <CoachAccessSection />
      </main>
    </div>
  );
}
