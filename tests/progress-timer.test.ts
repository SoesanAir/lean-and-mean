import { describe, expect, it } from "vitest";
import { buildSession } from "@/lib/session/snapshot";
import { getDayTemplate } from "@/lib/seed/week1";
import { sessionProgress } from "@/lib/session/progress";
import { elapsedMs } from "@/lib/session/timer";
import type { TimerState } from "@/lib/types";

describe("session progress", () => {
  it("starts at 0% and reaches 100% when everything is done", () => {
    const session = buildSession(getDayTemplate(1), "2026-08-29");
    expect(sessionProgress(session).percent).toBe(0);

    for (const r of session.sections) {
      if (r.skill) r.skill.completed = true;
      if (r.timedBlock) {
        r.timedBlock.completed = true;
        r.timedBlock.cycles.forEach((c) => (c.completed = true));
      }
      r.exercises?.forEach((e) => e.sets.forEach((s) => (s.completed = true)));
    }
    expect(sessionProgress(session).percent).toBe(100);
  });

  it("counts skipped sets (e.g. SKIPPED — EQUIPMENT SHAPE) toward completion", () => {
    const session = buildSession(getDayTemplate(5), "2026-08-29");
    const ball = session.sections.find((r) => r.sectionId === "d5-s7")!;
    ball.exercises![0].sets.forEach((s) => {
      s.skipped = true;
      s.skipReason = "SKIPPED — EQUIPMENT SHAPE";
    });
    const before = sessionProgress(session);
    expect(before.done).toBe(2);
  });
});

describe("persisted timer", () => {
  it("accumulates elapsed time across pause/resume and survives reload math", () => {
    const t0 = 1_000_000;
    let timer: TimerState = { status: "running", startedAt: t0, elapsedBeforePauseMs: 0 };
    expect(elapsedMs(timer, t0 + 30_000)).toBe(30_000);

    // pause at +30s
    timer = { status: "paused", elapsedBeforePauseMs: 30_000 };
    expect(elapsedMs(timer, t0 + 999_999)).toBe(30_000);

    // resume at some later wall-clock time
    timer = { status: "running", startedAt: t0 + 60_000, elapsedBeforePauseMs: 30_000 };
    expect(elapsedMs(timer, t0 + 90_000)).toBe(60_000);
  });
});
