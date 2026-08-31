"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { deleteCompletedSession } from "@/lib/session/store";
import { useAppState, useMounted } from "@/lib/session/useStore";
import { sessionProgress } from "@/lib/session/progress";
import { EMPHASIS_LABELS, type WorkoutDifficulty } from "@/lib/types";
import { TodayHeader } from "@/components/workout/TodayHeader";
import { SectionCard } from "@/components/workout/SectionCard";
import { Card, IntensityChip } from "@/components/ui";

const DIFFICULTY_LABELS: Record<WorkoutDifficulty, string> = {
  TOO_EASY: "😴 Too easy",
  RIGHT: "👍 Right",
  HARD: "🔥 Hard",
  TOO_HARD: "☠️ Too hard",
};

/**
 * Completed workout view (spec §31): exactly what was prescribed (immutable
 * snapshot) and what was actually done — weights, grips, reps, notes, rating.
 */
export default function HistoryPage() {
  // ?id= instead of a dynamic segment so the app statically exports for GitHub Pages
  return (
    <Suspense
      fallback={
        <main className="p-4">
          <p className="label pt-4">LOADING…</p>
        </main>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}

function HistoryContent() {
  const id = useSearchParams().get("id");
  const state = useAppState();
  const mounted = useMounted();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!mounted) {
    return (
      <main className="p-4">
        <p className="label pt-4">LOADING…</p>
      </main>
    );
  }

  const session = state.completedSessions.find((s) => s.id === id);
  if (!session) {
    return (
      <main className="space-y-4 p-4">
        <p className="pt-6 text-center text-mid">Workout not found.</p>
        <Link href="/progress" className="mx-auto flex h-12 w-40 items-center justify-center rounded-xl border border-line font-display font-bold text-hi active:scale-[0.98]">
          TO PROGRESS
        </Link>
      </main>
    );
  }

  const progress = sessionProgress(session);
  const f = session.feedback;

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-3">
        <Link href="/progress" aria-label="Back to progress" className="flex h-11 w-11 items-center justify-center rounded-lg text-mid active:scale-[0.95]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <p className="label">
          COMPLETED · {session.date}
        </p>
        <span className="w-11" aria-hidden />
      </div>

      <TodayHeader template={session.snapshot} quote={session.quote} percent={progress.percent} />

      <div className="space-y-3 p-4">
        {/* feedback summary */}
        {f && (
          <Card className="border-volt/30">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">SESSION RATING</h2>
              <IntensityChip intensity={session.snapshot.intensity} />
            </div>
            <p className="mt-2 text-2xl">{DIFFICULTY_LABELS[f.difficulty]}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <FeedbackStat label="ENERGY" value={f.energy} />
              <FeedbackStat label="SORE BEFORE" value={f.sorenessBefore} />
              <FeedbackStat label="SORE AFTER" value={f.sorenessAfter} />
            </dl>
            {f.pain ? (
              <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                Pain/discomfort: {f.painNote || "yes"}
              </p>
            ) : (
              <p className="mt-3 text-sm text-mid">No pain or discomfort reported.</p>
            )}
          </Card>
        )}

        {session.workoutNote?.text && (
          <Card>
            <p className="label mb-1">WORKOUT NOTES</p>
            <p className="text-base italic text-hi">“{session.workoutNote.text}”</p>
          </Card>
        )}

        {session.snapshot.sections.map((s, i) => {
          const r = session.sections.find((x) => x.sectionId === s.id);
          if (!r) return null;
          return (
            <SectionCard
              key={s.id}
              index={i}
              section={s}
              result={r}
              open
              onToggle={() => {}}
              readOnly
            />
          );
        })}

        <p className="pb-2 text-center text-xs text-low">
          Prescription snapshot from {new Date(session.startedAt).toLocaleString()} — {EMPHASIS_LABELS[session.snapshot.emphasis]}
        </p>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/40 font-display text-base font-semibold text-danger active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          DELETE THIS WORKOUT
        </button>
      </div>

      {confirmDelete && (
        <ConfirmSheet
          title="DELETE THIS WORKOUT?"
          detail={`Day ${session.day} — ${session.snapshot.name} (${session.date}). All logged sets, results and notes of this session will be removed from this device and the cloud.`}
          finalWarning="This permanently and irreversibly deletes the workout from your history everywhere. There is no undo."
          confirmLabel="DELETE"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteCompletedSession(session.id);
            setConfirmDelete(false);
            router.push("/progress");
          }}
        />
      )}
    </main>
  );
}

function FeedbackStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg bg-raised py-2">
      <dt className="label">{label}</dt>
      <dd className="font-display text-2xl font-bold tnum">{value ?? "—"}</dd>
    </div>
  );
}
