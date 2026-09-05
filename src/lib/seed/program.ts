import type { DayTemplate } from "../types";
import { WEEK2 } from "./week2";

// The program the app currently serves. Weeks are additive seed files
// (week1.ts, week2.ts, …); this pointer is what "start a workout" and the
// Today screen read. Bump CURRENT_WEEK + WEEK_START_DATE when a new week
// is published — completed history is immutable and never affected.
export const CURRENT_WEEK: DayTemplate[] = WEEK2;

// Anchor for "which day is next": sessions completed BEFORE this date belong
// to a previous week and don't count toward the current week's placement, so
// a freshly published week opens on Day 1 even if earlier days share numbers.
export const WEEK_START_DATE = "2026-09-05";

export function getCurrentDayTemplate(day: number): DayTemplate {
  const t = CURRENT_WEEK.find((d) => d.day === day);
  if (!t) throw new Error(`No template for day ${day}`);
  return t;
}
