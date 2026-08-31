"use client";

import { useState } from "react";
import { cls } from "@/lib/util";

/**
 * Two-step destructive confirmation (spec: deletion needs a second
 * confirmation screen). Stage 1 asks; stage 2 warns again in red and only
 * then calls onConfirm. Dismissable via scrim, Cancel, or the X.
 */
export function ConfirmSheet({
  title,
  detail,
  finalWarning,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  detail: string;
  finalWarning: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<1 | 2>(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cls(
          "w-full max-w-md rounded-t-2xl border-t bg-raised p-5",
          stage === 2 ? "border-danger/60" : "border-line",
        )}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className={cls("font-display text-2xl font-bold", stage === 2 && "text-danger")}>
            {stage === 1 ? title : "ARE YOU SURE?"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-mid active:scale-[0.95]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-base leading-snug text-mid">
          {stage === 1 ? detail : finalWarning}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-13 min-h-12 flex-1 rounded-xl border border-line bg-surface font-display text-base font-semibold text-hi active:scale-[0.97]"
          >
            CANCEL
          </button>
          {stage === 1 ? (
            <button
              type="button"
              onClick={() => setStage(2)}
              className="h-13 min-h-12 flex-1 rounded-xl border border-danger/50 bg-danger/10 font-display text-base font-bold text-danger active:scale-[0.97]"
            >
              {confirmLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="h-13 min-h-12 flex-1 rounded-xl bg-danger font-display text-base font-bold text-onvolt active:scale-[0.97]"
            >
              DELETE PERMANENTLY
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
