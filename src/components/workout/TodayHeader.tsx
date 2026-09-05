"use client";

import { useState } from "react";
import type { DayTemplate } from "@/lib/types";
import { EmphasisBadge, IntensityChip } from "@/components/ui";
import { cls } from "@/lib/util";

/**
 * Today header (spec §8): day, name, intensity, goal, emphasis, editable
 * quote, completion % — always visible while scrolling (sticky).
 */
export function TodayHeader({
  template,
  quote,
  onQuoteChange,
  percent,
  sticky,
  weekNumber,
}: {
  template: DayTemplate;
  quote: string;
  onQuoteChange?: (q: string) => void;
  percent: number | null;
  sticky?: boolean;
  /** shown as "WEEK n — DAY d"; omit to show just "DAY d" */
  weekNumber?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(quote);

  return (
    <header
      className={cls(
        "z-30 border-b border-line bg-bg/95 px-4 pb-3 backdrop-blur",
        sticky && "sticky top-0",
      )}
      style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="label">
            {weekNumber ? `WEEK ${weekNumber} — DAY ${template.day}` : `DAY ${template.day}`}
          </p>
          <h1 className="font-display text-[28px] font-bold leading-none">
            {template.intensity === "REST" ? "REST / RECOVERY" : `${template.intensity} — ${template.name.replace(/^(HARD|MEDIUM|LIGHT)\s*/i, "")}`}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5 pt-1">
          <IntensityChip intensity={template.intensity} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EmphasisBadge emphasis={template.emphasis} prominent />
      </div>

      <p className="mt-1.5 text-sm text-mid">{template.goal}</p>

      {/* editable motivational quote */}
      {editing && onQuoteChange ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onQuoteChange(draft.trim() || quote);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Motivational quote"
            className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-base italic text-hi"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!onQuoteChange) return;
            setDraft(quote);
            setEditing(true);
          }}
          className="mt-1.5 block w-full text-left font-display text-lg italic text-hi active:opacity-70"
          aria-label="Edit motivational quote"
        >
          “{quote}”
        </button>
      )}

      {/* completion — always visible (spec §5) */}
      {percent !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="label">COMPLETE</span>
            <span className="font-display text-xl font-bold text-volt tnum">{percent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full origin-left rounded-full bg-volt transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${percent / 100})`, width: "100%" }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
