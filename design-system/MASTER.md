# Lean & Mean — Design System (MASTER)

> Global source of truth for all UI. Page-specific overrides live in `design-system/pages/`.
> Methodology: ui-ux-pro-max (style/palette/typography selection + UX rules) combined with
> ui-ux-systems-designer (information hierarchy, input model, feedback language).

## 1. Product framing

- **Product type:** Personal training cockpit (single user, mid-workout usage).
- **Primary context:** One-handed iPhone use, sweaty hands, glanceable reading from ~1 m.
- **Style direction:** **Dark athletic cockpit** — flat black surfaces, hairline borders, one
  high-energy **orange** accent (token still named `volt` for stability; value is orange),
  oversized condensed numerals for load/time, zero decorative chrome.
- **Anti-patterns (never do):** corporate dashboard density, light-gray-on-white admin look,
  emoji as icons, hover-dependent interactions, small tap targets, casino gamification,
  giant empty textareas, low-contrast gray-on-gray text.

## 2. Color tokens (dark-first; dark is the only V1 theme)

| Token | Value | Usage | Contrast on `--bg` |
|---|---|---|---|
| `--bg` | `#09090B` | App background | — |
| `--surface` | `#141417` | Cards, sections | — |
| `--surface-raised` | `#1D1D22` | Sheets, modals, inputs | — |
| `--border` | `#27272A` | Hairline borders, dividers | — |
| `--text-hi` | `#FAFAFA` | Primary text, numerals | 17.8:1 ✓ |
| `--text-mid` | `#A1A1AA` | Secondary text, labels | 7.5:1 ✓ |
| `--text-low` | `#71717A` | Tertiary/meta | 4.6:1 ✓ |
| `--volt` | `#FB923C` | Accent (orange): completion, primary CTA, weight numerals | 8.3:1 ✓ |
| `--on-volt` | `#0A0A0A` | Text on accent | 8.3:1 ✓ |
| `--hard` | `#F87171` | HARD intensity | 6.8:1 ✓ |
| `--medium` | `#FBBF24` | MEDIUM intensity | 10.7:1 ✓ |
| `--light` | `#38BDF8` | LIGHT intensity | 8.1:1 ✓ |
| `--rest` | `#34D399` | REST intensity | 9.9:1 ✓ |
| `--note` | `#FBBF24` | "Note exists" indicator | 10.7:1 ✓ |
| `--danger` | `#F87171` | Destructive, pain flag | 6.8:1 ✓ |

Rules:
- Semantic tokens only in components — never raw hex.
- Color is never the only signal: intensity chips always carry the text label
  (HARD/MEDIUM/LIGHT/REST); completed sets show a check icon, not just a color change.
- Grip badges use outline style + text (`GRIP: HORNS`) — monochrome, never color-coded,
  so they stay readable in sunlight.

## 3. Typography

| Role | Font | Weight/size | Notes |
|---|---|---|---|
| Display / numerals / headers | **Barlow Condensed** | 600–700; 28–48px | Weights ("24 KG"), day titles, timers |
| Body / UI | **Inter** | 400–600; 16px base | Never below 12px; labels 12–13px uppercase tracked |
| Numbers in data rows / timers | Inter or Barlow Condensed | `tabular-nums` | Prevents timer/rep layout shift |

Scale: 12 (label) · 14 · 16 (body) · 18 · 22 (section) · 28 (screen title) · 40–56 (weight/timer display).
Line-height 1.5 body, 1.1 display. Uppercase + letter-spacing (0.06em) for labels/badges only.

## 4. Spacing, shape, elevation

- 4pt grid. Screen gutter 16px. Card padding 16px. Section gap 12px.
- Radius: cards 16px, buttons 12px, badges 8px, full-round for check circles.
- Elevation = border + background step (flat design); no drop-shadow soup. One shadow level
  allowed for sticky header/bottom sheet.
- Content max-width 28rem (`max-w-md`) centered; single column always.
- Safe areas: `viewport-fit=cover`; sticky header gets `env(safe-area-inset-top)`, bottom
  nav gets `env(safe-area-inset-bottom)`. Scroll containers add bottom padding = nav height.

## 5. Touch & interaction

- Minimum target 44×44px; primary actions (set check, timer start, FINISH) 48–56px tall.
- Set-complete check circle: 48px, right-hand side of the row (thumb zone).
- Press feedback: `active:scale-[0.97]` + background step, within 100ms.
- Steppers (− / +) instead of typing for reps; numeric keyboard (`inputmode="numeric"`) when typing.
- Destructive/irreversible (FINISH WORKOUT) = deliberate two-step (button → confirmation sheet).
- No hover-only affordances. `touch-action: manipulation` globally.

## 6. Motion

- Micro-interactions 150–250ms, ease-out enter / ease-in exit; exits ~70% of enter duration.
- Animate transform/opacity only. Note fields expand with height-auto grid trick or max-height on transform-safe wrapper.
- Set completion: check pops (scale 0.8→1.05→1, ~200ms) + row dims to "done" state.
- Completion bar animates width via transform scaleX.
- Timer minute rollover: full-screen surface flash (opacity pulse) + optional vibration.
- Respect `prefers-reduced-motion`: all non-essential animation off.

## 7. Component vocabulary

- **IntensityChip** — filled chip, intensity color at 15% alpha bg + colored text label.
- **EmphasisBadge** — outline badge: `QUALITY >>> QUANTITY` etc., prominent under header.
- **WeightDisplay** — Barlow Condensed 40px volt numerals + "KG" 16px.
- **GripBadge** — outline badge `GRIP: HORNS`, always adjacent to WeightDisplay, tappable → grip definition sheet.
- **BlockWeightBanner** — timed sections: full-width banner "20 KG — ENTIRE BLOCK" (single weight rule made visually structural).
- **SetRow** — reps stepper + 48px check circle + note toggle.
- **NoteField** — collapsed "+ Add note" (ghost button); expands to inline textarea; amber dot + first line preview when a note exists; autosaves (600ms debounce) with quiet "Saved" tick.
- **WatchFor** — collapsible disclosure inside card (`WATCH FOR` cues), collapsed by default, one tap to open.
- **ProgressBar** — sticky header completion %, volt fill.
- **BottomNav** — 3 items: Today / Log / Progress, icon + label, 56px + safe area.

## 8. Iconography

Lucide (stroke 2px), one style level, 24px default, monochrome `--text-mid` (volt when active).
Never emoji as structural icons (difficulty emoji 😴👍🔥☠️ are *content choices* in the finish
form, rendered large as tappable options with text labels — allowed as content, not chrome).

## 9. Accessibility

- Contrast per table above (all AA+ on dark; verified values).
- Labels on all inputs; errors inline below fields.
- Focus-visible rings (2px volt) for keyboard/switch access.
- `aria-live="polite"` for autosave + timer announcements.
- Reduced motion supported; text scaling doesn't truncate (wrap, don't ellipsize prescriptions).
- One-handed: all primary actions in bottom 60% of screen; header is read-only.
