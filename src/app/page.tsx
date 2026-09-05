"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppState, useMounted } from "@/lib/session/useStore";
import { CURRENT_WEEK, getCurrentDayTemplate, WEEK_START_DATE } from "@/lib/seed/program";
import { buildSession } from "@/lib/session/snapshot";
import { nextProgramDay, sectionProgress, sessionProgress } from "@/lib/session/progress";
import { discardActiveWorkout, setDayQuote, setSessionQuote, startWorkout } from "@/lib/session/store";
import { todayISO } from "@/lib/util";
import { cls } from "@/lib/util";
import { TodayHeader } from "@/components/workout/TodayHeader";
import { SectionCard } from "@/components/workout/SectionCard";
import { FinishSheet } from "@/components/workout/FinishSheet";
import { Card } from "@/components/ui";


export default function TodayPage() {
  const state = useAppState();
  const active = state.activeSession;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  // client-only render: state lives in localStorage and "today" depends on the
  // device clock, so skip SSR HTML to avoid hydration mismatches
  const mounted = useMounted();

  // default: resume the active workout's day, else the first not-yet-completed day
  const day = selectedDay ?? active?.day ?? (mounted ? nextProgramDay(state.completedSessions, WEEK_START_DATE) : 1);
  const template = getCurrentDayTemplate(day);
  const isLive = active !== null && active.day === day;

  // preview scaffold for non-started days (read-only, not persisted)
  const preview = useMemo(
    () => (isLive ? null : buildSession(template, todayISO())),
    [isLive, template],
  );

  const session = isLive ? active! : preview!;
  const progress = sessionProgress(session);

  const firstIncomplete = useMemo(() => {
    for (const r of session.sections) {
      const prog = sectionProgress(r);
      if (prog.total > 0 && prog.done < prog.total) return r.sectionId;
    }
    return null;
  }, [session]);

  const open = openSection ?? firstIncomplete;

  if (!mounted) {
    return (
      <main className="p-4">
        <p className="label pt-4">LOADING TODAY…</p>
      </main>
    );
  }

  return (
    <main>
      {/* day navigation (spec §30.12 — browse all 7 days for testing) */}
      <div className="flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => {
            setSelectedDay(day === 1 ? 7 : day - 1);
            setOpenSection(null);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.95]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex gap-0.5" role="tablist" aria-label="Program days">
          {CURRENT_WEEK.map((d) => (
            <button
              key={d.day}
              type="button"
              role="tab"
              aria-selected={d.day === day}
              aria-label={`Day ${d.day}`}
              onClick={() => {
                setSelectedDay(d.day);
                setOpenSection(null);
              }}
              className={cls(
                "h-9 w-9 rounded-full font-display text-sm font-bold active:scale-[0.9]",
                d.day === day
                  ? "bg-volt text-onvolt"
                  : active?.day === d.day
                    ? "border border-volt text-volt"
                    : "border border-line text-mid",
              )}
            >
              {d.day}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => {
            setSelectedDay(day === 7 ? 1 : day + 1);
            setOpenSection(null);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.95]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <TodayHeader
        template={session.snapshot}
        quote={isLive ? active!.quote : (state.quoteOverrides[day] ?? template.quote)}
        onQuoteChange={(q) => (isLive ? setSessionQuote(q) : setDayQuote(day, q))}
        percent={template.isRest ? null : progress.percent}
        sticky
      />

      {/* workout in progress on a different day */}
      {active && active.day !== day && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl border border-volt/40 bg-volt/10 px-3 py-2.5">
          <p className="text-sm text-hi">
            Workout in progress: <span className="font-bold">DAY {active.day}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedDay(active.day);
              setOpenSection(null);
            }}
            className="h-10 rounded-lg bg-volt px-3 font-display font-bold text-onvolt active:scale-[0.97]"
          >
            RESUME
          </button>
        </div>
      )}

      {/* rest day (spec Day 7) */}
      {template.isRest ? (
        <div className="space-y-3 p-4">
          <Card>
            <h2 className="font-display text-xl font-bold">RECOVERY SUGGESTIONS</h2>
            <ul className="mt-2 space-y-1.5">
              {(template.restSuggestions ?? []).map((s) => (
                <li key={s} className="flex gap-2 text-[15px] text-hi">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-rest" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-mid">
              No formal workout today. Recovery is what makes the hard days work.
            </p>
          </Card>
          <Link
            href="/log"
            className="flex h-14 items-center justify-center rounded-xl border border-line bg-surface font-display text-lg font-bold text-hi active:scale-[0.98]"
          >
            LOG TODAY (WEIGHT · SLEEP · FOOD · NOTES)
          </Link>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {/* sections */}
          {session.snapshot.sections.map((s, i) => {
            const r = session.sections.find((x) => x.sectionId === s.id);
            if (!r) return null;
            return (
              <SectionCard
                key={s.id}
                index={i}
                section={s}
                result={r}
                open={open === s.id}
                onToggle={() => setOpenSection(open === s.id ? "" : s.id)}
                readOnly={!isLive}
              />
            );
          })}

          {/* primary action */}
          {!isLive ? (
            <button
              type="button"
              onClick={() => {
                if (active) return; // banner handles resume
                startWorkout(day);
                setOpenSection(null);
              }}
              disabled={active !== null}
              className="h-14 w-full rounded-xl bg-volt font-display text-xl font-bold tracking-wide text-onvolt active:scale-[0.98] disabled:opacity-40"
            >
              START WORKOUT
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setFinishOpen(true)}
                className="h-14 w-full rounded-xl bg-volt font-display text-xl font-bold tracking-wide text-onvolt active:scale-[0.98]"
              >
                FINISH WORKOUT
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Discard this workout? All logged sets and notes for it will be lost.")) {
                    discardActiveWorkout();
                  }
                }}
                className="mx-auto block min-h-11 px-4 text-sm text-low active:opacity-70"
              >
                Discard workout
              </button>
            </>
          )}
        </div>
      )}

      {finishOpen && isLive && (
        <FinishSheet
          onClose={() => setFinishOpen(false)}
          onFinished={() => {
            setFinishOpen(false);
            setCelebrate(String(progress.percent));
          }}
        />
      )}

      {/* one satisfying moment — not a casino (spec §27) */}
      {celebrate !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" role="dialog" aria-modal="true" aria-label="Workout complete">
          <div className="w-full max-w-md rounded-2xl border border-volt/40 bg-raised p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-volt">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-onvolt" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold">WORKOUT COMPLETE</h2>
            <p className="mt-1 font-display text-xl text-volt tnum">{celebrate}% logged</p>
            <div className="mt-6 flex flex-col gap-2">
              {state.completedSessions[0] && (
                <Link
                  href={`/history?id=${state.completedSessions[0].id}`}
                  onClick={() => setCelebrate(null)}
                  className="flex h-12 items-center justify-center rounded-xl bg-volt font-display text-lg font-bold text-onvolt active:scale-[0.98]"
                >
                  VIEW WORKOUT
                </Link>
              )}
              <button
                type="button"
                onClick={() => setCelebrate(null)}
                className="h-12 rounded-xl border border-line font-display text-lg font-bold text-mid active:scale-[0.98]"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
