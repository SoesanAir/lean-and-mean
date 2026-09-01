"use client";

// Unified "i" information mechanism — used by warm-up movements, skill
// variations, and any unfamiliar exercise. Written instructions are the
// mandatory content; video is optional (verified links only) with a YouTube
// search fallback. Opening this NEVER touches any running timer.

export interface MovementInfo {
  name: string;
  shortCue?: string;
  instructions: string[];
  tips?: string[];
  stopWhen?: string;
  videoUrl?: string;
  /** canonical search term for the YouTube fallback */
  youtubeQuery?: string;
}

export function InfoButton({ onOpen, label }: { onOpen: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`How to: ${label}`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mid active:scale-[0.9]"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8v.01" />
      </svg>
    </button>
  );
}

export function InfoSheet({ info, onClose }: { info: MovementInfo; onClose: () => void }) {
  const query = info.youtubeQuery ?? info.name;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`How to perform ${info.name}`}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-line bg-raised p-5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold leading-tight">{info.name}</h2>
            {info.shortCue && <p className="mt-1 text-sm text-mid">{info.shortCue}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-mid active:scale-[0.95]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ol className="mt-3 space-y-2">
          {info.instructions.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-snug text-hi">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface font-display text-xs font-bold text-volt">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {info.tips && info.tips.length > 0 && (
          <div className="mt-4">
            <p className="label mb-1 text-volt">CUES</p>
            <ul className="space-y-1.5">
              {info.tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-[15px] leading-snug text-hi">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-volt" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {info.stopWhen && (
          <p className="mt-4 rounded-lg border border-med/40 bg-med/10 px-3 py-2 text-sm text-med">
            {info.stopWhen}
          </p>
        )}

        <div className="mt-5">
          {info.videoUrl ? (
            <a
              href={info.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-volt font-display text-base font-bold text-onvolt active:scale-[0.98]"
            >
              WATCH DEMO
            </a>
          ) : (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " exercise")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line font-display text-base font-semibold text-mid active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              SEARCH YOUTUBE
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
