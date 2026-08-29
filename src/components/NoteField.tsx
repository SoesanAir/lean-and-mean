"use client";

import { useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/types";
import { cls } from "@/lib/util";

/**
 * Compact note interaction (spec §7): "+ Add note" → inline textarea.
 * - Existing notes are visually obvious (amber dot + preview).
 * - Autosaves with 600ms debounce + flush on blur/unmount.
 * - The parent persists via `onSave` (store writes localStorage synchronously).
 */
export function NoteField({
  note,
  onSave,
  placeholder = "Add note…",
  compact,
}: {
  note?: Note;
  onSave: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note?.text ?? "");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text: note?.text ?? "", dirty: false });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    if (latest.current.dirty) {
      onSave(latest.current.text);
      latest.current.dirty = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  };

  // flush on unmount so no text is ever lost
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current.dirty) onSave(latest.current.text);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (v: string) => {
    setText(v);
    latest.current = { text: v, dirty: true };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  const hasNote = Boolean(note?.text?.trim());

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          // load the latest saved text when opening (no effect-based syncing)
          setText(note?.text ?? "");
          latest.current = { text: note?.text ?? "", dirty: false };
          setOpen(true);
        }}
        className={cls(
          "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm active:scale-[0.99]",
          hasNote ? "text-hi" : "text-low",
          compact && "min-h-9",
        )}
        aria-label={hasNote ? "Edit note" : "Add note"}
      >
        {hasNote ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-note" aria-hidden />
            <span className="truncate italic">{note!.text}</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none" aria-hidden>
              +
            </span>
            {placeholder.replace("…", "")}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          flush();
          if (!text.trim()) setOpen(false);
        }}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-y rounded-lg border border-line bg-raised p-3 text-base text-hi placeholder:text-low"
      />
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-low" aria-live="polite">
          {saved ? "Saved" : "Autosaves as you type"}
        </span>
        <button
          type="button"
          onClick={() => {
            flush();
            setOpen(false);
          }}
          className="min-h-9 rounded-lg px-3 text-sm font-semibold text-volt active:scale-[0.97]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
