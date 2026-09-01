// Coach-view shaping — the SINGLE interpretation of workout data, shared by
// the app and the coach-read Edge Function (which bundles this file). Pure:
// operates on domain objects (WorkoutSession from the immutable session
// snapshot + performance), no I/O, no framework imports.
//
// Historical truth: everything here reads the session's own snapshot
// (prescriptions as they were when the workout ran), never today's templates.

// .ts extensions: this file is also bundled by the Deno-based Edge Function.
import type {
  DailyLog,
  SetResult,
  SetsPrescription,
  TimedMovement,
  WorkoutSession,
} from "../types.ts";
import { EMPHASIS_LABELS } from "../types.ts";
import { sessionProgress } from "../session/progress.ts";
import { EXERCISES, EXERCISES_BY_ID } from "../seed/exercises.ts";
import { getSkillVariation, SKILL_FAMILIES_BY_ID } from "../seed/skills.ts";
import { WARMUP_MOVEMENTS_BY_ID } from "../seed/warmups.ts";

// ---------- small helpers ----------

function exerciseName(exerciseId: string, displayName?: string): string {
  return displayName ?? EXERCISES_BY_ID[exerciseId]?.name ?? exerciseId;
}

function noteText(note?: { text: string }): string | undefined {
  const t = note?.text?.trim();
  return t ? t : undefined;
}

function shapeSetResult(p: SetsPrescription, s: SetResult) {
  return {
    setIndex: s.setIndex + 1,
    completed: s.completed,
    skipped: s.skipped || undefined,
    skipReason: s.skipReason,
    actualReps: s.actualReps,
    actualRepsLeft: s.actualRepsLeft,
    actualRepsRight: s.actualRepsRight,
    actualDurationSec: s.actualDurationSec,
    perceivedDifficulty: s.perceivedDifficulty,
    note: noteText(s.note),
    prescribed: p.durationSec ? `${p.durationSec} sec${p.perSide ? " / side" : ""}` : `${p.reps ?? "?"}${p.perSide ? " / side" : ""}${p.eachDirection ? " each direction" : ""}`,
  };
}

function shapePrescription(p: SetsPrescription) {
  return {
    exerciseId: p.exerciseId,
    name: exerciseName(p.exerciseId, p.displayName),
    sets: p.sets,
    reps: p.reps,
    perSide: p.perSide || undefined,
    eachDirection: p.eachDirection || undefined,
    durationSec: p.durationSec,
    tempo: p.tempo,
    weightKg: p.weightKg,
    grip: p.grip,
    gripNotes: p.gripNotes,
  };
}

function shapeMovement(m: TimedMovement) {
  return {
    exerciseId: m.exerciseId,
    name: exerciseName(m.exerciseId, m.displayName),
    reps: m.reps,
    perSide: m.perSide || undefined,
    eachDirection: m.eachDirection || undefined,
    grip: m.grip,
    bodyweight: m.bodyweight || undefined,
  };
}

// ---------- full day/session detail ----------

export function shapeSessionDetail(session: WorkoutSession) {
  const t = session.snapshot;
  const progress = sessionProgress(session);

  const sections = t.sections.map((section) => {
    const result = session.sections.find((r) => r.sectionId === section.id);
    const base = {
      id: section.id,
      title: section.title,
      type: section.type,
      emphasis: section.emphasis ? EMPHASIS_LABELS[section.emphasis] : undefined,
      note: noteText(result?.note),
    };

    switch (section.type) {
      case "WARMUP":
        return {
          ...base,
          targetMinutes: section.targetMinutes,
          movements: section.movements.map(
            (m) => WARMUP_MOVEMENTS_BY_ID[m.movementId]?.name ?? m.movementId,
          ),
          result: result?.warmup
            ? { completed: result.warmup.completed, movementsDone: result.warmup.movementsDone }
            : null,
        };
      case "SKILL_PRACTICE": {
        const sp = result?.skillPractice;
        const family = SKILL_FAMILIES_BY_ID[section.familyId];
        const prescribed = getSkillVariation(section.familyId, section.variationId);
        const performed = sp ? getSkillVariation(section.familyId, sp.selectedVariationId) : null;
        return {
          ...base,
          skillFamily: family?.name ?? section.familyId,
          prescribedVariation: prescribed?.name ?? section.variationId,
          performedVariation: performed?.name ?? sp?.selectedVariationId ?? null,
          manualAdjustment: sp?.manualAdjustment ?? null,
          prescription: section.prescription,
          sets: sp
            ? sp.sets.map((s) => ({
                setIndex: s.setIndex + 1,
                completed: s.completed,
                actualReps: s.actualReps,
                actualDurationSec: s.actualDurationSec,
                note: noteText(s.note),
              }))
            : [],
          result: sp ? { completed: sp.completed, note: noteText(sp.note) } : null,
        };
      }
      case "SKILL":
        return {
          ...base,
          exerciseId: section.exerciseId,
          name: exerciseName(section.exerciseId),
          prescribedMinutes: section.durationMin,
          result: result?.skill
            ? {
                completed: result.skill.completed,
                actualDurationMin: result.skill.actualDurationMin,
                bestHoldSec: result.skill.bestHoldSec,
                attempts: result.skill.attempts,
                note: noteText(result.skill.note),
              }
            : null,
        };
      case "STRAIGHT_SETS":
      case "CIRCUIT":
        return {
          ...base,
          rounds: section.type === "CIRCUIT" ? section.rounds : undefined,
          exercises: section.prescriptions.map((p) => {
            const er = result?.exercises?.find((e) => e.prescriptionId === p.id);
            return {
              prescription: shapePrescription(p),
              sets: er ? er.sets.map((s) => shapeSetResult(p, s)) : [],
              note: noteText(er?.note),
            };
          }),
        };
      case "INTERVAL": {
        const er = result?.exercises?.[0];
        return {
          ...base,
          exerciseId: section.exerciseId,
          name: exerciseName(section.exerciseId),
          rounds: section.rounds,
          workSec: section.workSec,
          restSec: section.restSec,
          roundsCompleted: er ? er.sets.filter((s) => s.completed).length : 0,
          roundNotes: er
            ? er.sets
                .filter((s) => noteText(s.note))
                .map((s) => ({ round: s.setIndex + 1, note: noteText(s.note)! }))
            : [],
        };
      }
      case "EMOM":
      case "AMRAP":
      case "FLOW": {
        const tb = result?.timedBlock;
        const movements =
          section.type === "EMOM" ? section.pattern : section.type === "AMRAP" ? section.round : section.movements;
        return {
          ...base,
          // spec §13: ONE kettlebell weight for the whole timed block
          blockWeightKg: section.blockWeightKg,
          minutes: section.type === "FLOW" ? undefined : section.minutes,
          rounds: section.type === "FLOW" ? section.rounds : undefined,
          isBenchmark: section.type === "AMRAP" ? section.isBenchmark : undefined,
          benchmarkLabel: section.type === "AMRAP" ? section.benchmarkLabel : undefined,
          movements: movements.map(shapeMovement),
          result: tb
            ? {
                completed: tb.completed,
                completedMinutes: tb.completedMinutes,
                completedRounds: tb.completedRounds,
                extraReps: tb.extraReps,
                resultSummary: tb.resultSummary,
                perceivedDifficulty: tb.perceivedDifficulty,
                cyclesDone: tb.cycles.filter((c) => c.completed).length,
                cyclesTotal: tb.cycles.length,
                cycleNotes: tb.cycles
                  .filter((c) => noteText(c.note))
                  .map((c) => ({ cycle: c.label, note: noteText(c.note)! })),
                note: noteText(tb.note),
              }
            : null,
        };
      }
    }
  });

  return {
    id: session.id,
    date: session.date,
    day: session.day,
    name: t.name,
    intensity: t.intensity,
    emphasis: EMPHASIS_LABELS[t.emphasis],
    goal: t.goal,
    quote: session.quote,
    status: session.finishedAt ? ("completed" as const) : ("active" as const),
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    completion: progress,
    feedback: session.feedback
      ? {
          difficulty: session.feedback.difficulty,
          energy: session.feedback.energy,
          sorenessBefore: session.feedback.sorenessBefore,
          sorenessAfter: session.feedback.sorenessAfter,
          pain: session.feedback.pain,
          painNote: session.feedback.painNote,
        }
      : null,
    workoutNote: noteText(session.workoutNote),
    sections,
  };
}

/** Compact one-line summary (week views, lists). */
export function summarizeSession(session: WorkoutSession) {
  const progress = sessionProgress(session);
  const benchmarks = session.snapshot.sections
    .filter((s) => s.type === "AMRAP" && s.isBenchmark)
    .map((s) => {
      const tb = session.sections.find((r) => r.sectionId === s.id)?.timedBlock;
      return { title: s.title, result: tb?.resultSummary ?? null };
    });
  return {
    id: session.id,
    date: session.date,
    day: session.day,
    name: session.snapshot.name,
    intensity: session.snapshot.intensity,
    status: session.finishedAt ? ("completed" as const) : ("active" as const),
    completionPercent: progress.percent,
    difficulty: session.feedback?.difficulty ?? null,
    pain: session.feedback?.pain ?? null,
    benchmarks,
    workoutNote: noteText(session.workoutNote),
  };
}

// ---------- daily log ----------

export function shapeDailyLog(log: DailyLog) {
  return {
    date: log.date,
    weightKg: log.weightKg,
    waistCm: log.waistCm,
    steps: log.steps,
    sleepHours: log.sleepHours,
    energy: log.energy,
    soreness: log.soreness,
    proteinG: log.proteinG,
    calories: log.calories,
    note: noteText(log.note),
  };
}

// ---------- exercise history ----------

export interface ExerciseHistoryEntry {
  date: string;
  day: number;
  sessionName: string;
  context: string; // e.g. "STRAIGHT SETS — CLEAN + STRICT PRESS" or "EMOM — MAIN EMOM (16 kg block)"
  prescription: {
    sets?: number;
    reps?: number | string;
    perSide?: boolean;
    durationSec?: number;
    weightKg?: number;
    blockWeightKg?: number | null;
    grip: string;
  };
  sets?: ReturnType<typeof shapeSetResult>[];
  blockResult?: { resultSummary?: string; completedMinutes?: number; completedRounds?: number; extraReps?: number };
  notes: string[];
}

/** History for one exercise across sessions — includes timed-block appearances. */
export function exerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  limit: number,
): ExerciseHistoryEntry[] {
  const entries: ExerciseHistoryEntry[] = [];
  for (const session of sessions) {
    for (const section of session.snapshot.sections) {
      const result = session.sections.find((r) => r.sectionId === section.id);
      if (section.type === "STRAIGHT_SETS" || section.type === "CIRCUIT") {
        for (const p of section.prescriptions) {
          if (p.exerciseId !== exerciseId) continue;
          const er = result?.exercises?.find((e) => e.prescriptionId === p.id);
          const sets = er?.sets.map((s) => shapeSetResult(p, s)) ?? [];
          entries.push({
            date: session.date,
            day: session.day,
            sessionName: session.snapshot.name,
            context: `${section.type === "CIRCUIT" ? "CIRCUIT" : "SETS"} — ${section.title}`,
            prescription: {
              sets: p.sets,
              reps: p.reps,
              perSide: p.perSide,
              durationSec: p.durationSec,
              weightKg: p.weightKg,
              grip: p.grip,
            },
            sets,
            notes: [noteText(er?.note), ...sets.map((s) => s.note)].filter(Boolean) as string[],
          });
        }
      } else if (section.type === "EMOM" || section.type === "AMRAP" || section.type === "FLOW") {
        const movements =
          section.type === "EMOM" ? section.pattern : section.type === "AMRAP" ? section.round : section.movements;
        for (const m of movements) {
          if (m.exerciseId !== exerciseId) continue;
          const tb = result?.timedBlock;
          entries.push({
            date: session.date,
            day: session.day,
            sessionName: session.snapshot.name,
            context: `${section.type} — ${section.title}${section.blockWeightKg !== null ? ` (${section.blockWeightKg} kg block)` : ""}`,
            prescription: {
              reps: m.reps,
              perSide: m.perSide,
              blockWeightKg: section.blockWeightKg,
              grip: m.grip,
            },
            blockResult: tb
              ? {
                  resultSummary: tb.resultSummary,
                  completedMinutes: tb.completedMinutes,
                  completedRounds: tb.completedRounds,
                  extraReps: tb.extraReps,
                }
              : undefined,
            notes: [noteText(tb?.note)].filter(Boolean) as string[],
          });
        }
      } else if (section.type === "SKILL" && section.exerciseId === exerciseId) {
        const sk = result?.skill;
        entries.push({
          date: session.date,
          day: session.day,
          sessionName: session.snapshot.name,
          context: `SKILL — ${section.title}`,
          prescription: { durationSec: section.durationMin * 60, grip: "BODYWEIGHT" },
          blockResult: undefined,
          sets: undefined,
          notes: [
            sk?.bestHoldSec !== undefined ? `best hold ${sk.bestHoldSec}s` : undefined,
            noteText(sk?.note),
          ].filter(Boolean) as string[],
        });
      }
    }
    if (entries.length >= limit) break;
  }
  return entries.slice(0, limit);
}

// ---------- recent notes ----------

export interface CoachNote {
  date: string;
  context: string;
  text: string;
  updatedAt: string;
}

export function collectNotes(
  sessions: WorkoutSession[],
  dailyLogs: DailyLog[],
  limit: number,
): CoachNote[] {
  const notes: CoachNote[] = [];
  const push = (date: string, context: string, note?: { text: string; updatedAt: string }) => {
    const text = noteText(note);
    if (text) notes.push({ date, context, text, updatedAt: note!.updatedAt });
  };

  for (const s of sessions) {
    const label = `Day ${s.day} — ${s.snapshot.name}`;
    push(s.date, `Workout (${label})`, s.workoutNote);
    if (s.feedback?.pain && s.feedback.painNote) {
      push(s.date, `Pain/discomfort (${label})`, {
        text: s.feedback.painNote,
        updatedAt: s.finishedAt ?? s.startedAt,
      });
    }
    for (const section of s.snapshot.sections) {
      const r = s.sections.find((x) => x.sectionId === section.id);
      if (!r) continue;
      push(s.date, `${section.title} (${label})`, r.note);
      push(s.date, `${section.title} — block (${label})`, r.timedBlock?.note);
      push(s.date, `${section.title} — skill (${label})`, r.skill?.note);
      r.timedBlock?.cycles.forEach((c) => push(s.date, `${section.title} — ${c.label} (${label})`, c.note));
      if (section.type === "STRAIGHT_SETS" || section.type === "CIRCUIT") {
        for (const p of section.prescriptions) {
          const er = r.exercises?.find((e) => e.prescriptionId === p.id);
          if (!er) continue;
          const name = exerciseName(p.exerciseId, p.displayName);
          push(s.date, `${name} (${label})`, er.note);
          er.sets.forEach((set) =>
            push(s.date, `${name} — set ${set.setIndex + 1} (${label})`, set.note),
          );
        }
      } else if (section.type === "INTERVAL") {
        const er = r.exercises?.[0];
        const name = exerciseName(section.exerciseId);
        er?.sets.forEach((set) =>
          push(s.date, `${name} — round ${set.setIndex + 1} (${label})`, set.note),
        );
      }
    }
  }
  for (const log of dailyLogs) {
    push(log.date, "Daily log", log.note);
  }

  return notes.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, limit);
}

// ---------- exercise discovery (for AI coaches: name → stable id) ----------

export interface ExerciseCatalogEntry {
  exerciseId: string;
  name: string;
  aliases?: string[];
  /** date last seen in a session snapshot; absent when never performed */
  lastPerformed?: string;
  /** sessions in the inspected window that contain this exercise */
  sessionsCount: number;
  /** false = exists in the library but has no recorded history */
  performed: boolean;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesQuery(query: string, haystacks: string[]): boolean {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const joined = haystacks.map(normalize).join(" | ");
  // every query token must appear somewhere (forgiving substring match:
  // "clean press" ⊂ "clean strict press"; alias list covers "c&p" etc.)
  return tokens.every((t) => joined.includes(t));
}

function sessionExerciseIds(session: WorkoutSession): string[] {
  const ids: string[] = [];
  for (const section of session.snapshot.sections) {
    switch (section.type) {
      case "SKILL":
      case "INTERVAL":
        ids.push(section.exerciseId);
        break;
      case "STRAIGHT_SETS":
      case "CIRCUIT":
        ids.push(...section.prescriptions.map((p) => p.exerciseId));
        break;
      case "EMOM":
        ids.push(...section.pattern.map((m) => m.exerciseId));
        break;
      case "AMRAP":
        ids.push(...section.round.map((m) => m.exerciseId));
        break;
      case "FLOW":
        ids.push(...section.movements.map((m) => m.exerciseId));
        break;
      case "WARMUP":
      case "SKILL_PRACTICE":
        // separate id spaces (warm-up movements / skill variations) — not
        // part of the exercise catalog
        break;
    }
  }
  return ids;
}

/**
 * Resolve human names ("clean press", "C&P") to stable exercise ids.
 * Without a query: the user's performed exercises. With a query: performed
 * matches first, then matching library exercises (performed=false) so the
 * coach can also answer "you have never trained that".
 */
export function exerciseCatalog(
  sessions: WorkoutSession[],
  query: string | null,
  limit: number,
): ExerciseCatalogEntry[] {
  const usage = new Map<string, { lastPerformed: string; sessionsCount: number }>();
  for (const s of sessions) {
    for (const id of new Set(sessionExerciseIds(s))) {
      const u = usage.get(id);
      if (u) {
        u.sessionsCount += 1;
        if (s.date > u.lastPerformed) u.lastPerformed = s.date;
      } else {
        usage.set(id, { lastPerformed: s.date, sessionsCount: 1 });
      }
    }
  }

  const toEntry = (id: string): ExerciseCatalogEntry => {
    const ex = EXERCISES_BY_ID[id];
    const u = usage.get(id);
    return {
      exerciseId: id,
      name: ex?.name ?? id,
      aliases: ex?.aliases,
      lastPerformed: u?.lastPerformed,
      sessionsCount: u?.sessionsCount ?? 0,
      performed: Boolean(u),
    };
  };

  const searchable = (id: string): string[] => {
    const ex = EXERCISES_BY_ID[id];
    return [id, ex?.name ?? "", ...(ex?.aliases ?? [])];
  };

  const performed = [...usage.keys()]
    .filter((id) => !query || matchesQuery(query, searchable(id)))
    .map(toEntry)
    .sort((a, b) => (a.lastPerformed! < b.lastPerformed! ? 1 : -1));

  let library: ExerciseCatalogEntry[] = [];
  if (query) {
    library = EXERCISES.filter(
      (ex) => !usage.has(ex.id) && matchesQuery(query, [ex.id, ex.name, ...(ex.aliases ?? [])]),
    ).map((ex) => toEntry(ex.id));
  }

  return [...performed, ...library].slice(0, limit);
}

// ---------- week ----------

export function weekView(
  sessions: WorkoutSession[],
  dailyLogs: DailyLog[],
  startDate: string, // Monday, YYYY-MM-DD
  dates: string[], // the 7 dates of the week
) {
  const byDate = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }
  const logByDate = new Map(dailyLogs.map((l) => [l.date, l]));
  const days = dates.map((date) => ({
    date,
    sessions: (byDate.get(date) ?? []).map(summarizeSession),
    dailyLog: logByDate.has(date) ? shapeDailyLog(logByDate.get(date)!) : null,
  }));
  const completed = sessions.filter((s) => s.finishedAt);
  return {
    start: startDate,
    end: dates[6],
    workoutsCompleted: completed.length,
    days,
    notes: collectNotes(sessions, dailyLogs, 30),
  };
}
