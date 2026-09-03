// Lean & Mean — domain model.
// Templates describe the future; sessions describe what actually happened (spec §23).

// ---------- Grip (first-class data, spec §11/§12/§25) ----------

export type GripType =
  | "HANDLE"
  | "HORNS"
  | "BALL"
  | "BOTTOM_UP_HANDLE"
  | "BODYWEIGHT"
  | "NONE";

export const GRIP_DEFINITIONS: Record<GripType, string> = {
  HANDLE: "Normal grip around the kettlebell handle. Swings, cleans, presses, rows, carries.",
  HORNS:
    "Hold both sides of the handle where it joins the bell. Goblet squats, halos, horn curls. Contributes to forearm and grip work.",
  BALL: "Both hands cup/grip the body of the kettlebell. Slow/static controlled movements ONLY — never ballistic.",
  BOTTOM_UP_HANDLE:
    "Hold the handle while balancing the bell upside-down. Heavy grip, forearm, wrist and shoulder stabilization demand.",
  BODYWEIGHT: "No kettlebell — bodyweight movement.",
  NONE: "No grip applicable.",
};

// ---------- Training taxonomy ----------

export type Intensity = "HARD" | "MEDIUM" | "LIGHT" | "REST";

export type Emphasis = "SKILL" | "QUALITY" | "VOLUME" | "OUTPUT";

export const EMPHASIS_LABELS: Record<Emphasis, string> = {
  SKILL: "QUALITY >>> QUANTITY",
  QUALITY: "QUALITY > QUANTITY",
  VOLUME: "QUALITY + VOLUME",
  OUTPUT: "OUTPUT",
};

export const EMPHASIS_DESCRIPTIONS: Record<Emphasis, string> = {
  SKILL: "Skill/technique dominates. The goal is excellent movement.",
  QUALITY: "Train hard, but clean repetitions matter more than score.",
  VOLUME: "Controlled hypertrophy / productive training volume.",
  OUTPUT: "Measurable performance matters. Record the score — technique still cannot become reckless.",
};

export type ExerciseCategory =
  | "SKILL"
  | "BALLISTIC"
  | "SQUAT_LEGS"
  | "HINGE"
  | "PULL"
  | "PUSH"
  | "CORE"
  | "GRIP_ARMS"
  | "CONDITIONING";

export type Equipment =
  | "KETTLEBELL"
  | "BODYWEIGHT"
  | "JUMP_ROPE"
  | "PULLUP_BAR"
  | "RINGS"
  | "DOUBLE_KETTLEBELL";

export interface Exercise {
  id: string; // stable slug, e.g. "goblet-squat"
  name: string;
  category: ExerciseCategory;
  equipment: Equipment[];
  /** false until the required equipment arrives (spec §2) */
  isAvailable: boolean;
  defaultGrip: GripType;
  purpose: string[];
  watchFor: string[];
  commonMistakes?: string[];
  /** common alternative names, for exercise discovery/search (e.g. "C&P") */
  aliases?: string[];
}

// ---------- Prescriptions (templates) ----------

interface PrescriptionBase {
  id: string; // unique within the day, e.g. "d1-clean-press"
  exerciseId: string;
  /** display override, e.g. "Clean + Strict Press" */
  displayName?: string;
  grip: GripType;
  gripNotes?: string;
  /** override library cues for this prescription, if any */
  watchFor?: string[];
  purpose?: string[];
}

/** Straight-sets / circuit work. May carry its own weight. */
export interface SetsPrescription extends PrescriptionBase {
  kind: "SETS";
  sets: number;
  /** prescribed rest between sets of THIS exercise (data, not UI logic) */
  restSeconds?: number;
  /** e.g. 5, or a range like "8–12" */
  reps?: number | string;
  perSide?: boolean;
  eachDirection?: boolean;
  /** timed holds/carries, seconds per set (per side if perSide) */
  durationSec?: number;
  tempo?: string; // e.g. "3 seconds down"
  weightKg?: number; // absent for bodyweight
}

/**
 * A movement inside a timed block (EMOM / AMRAP / flow).
 * DELIBERATELY has no weight field — spec §13: ONE WEIGHT PER TIMED SECTION.
 * Weight lives at section level (blockWeightKg). Grip can still vary per movement.
 */
export interface TimedMovement extends PrescriptionBase {
  kind: "TIMED_MOVEMENT";
  reps: number;
  perSide?: boolean;
  eachDirection?: boolean;
  /** BODYWEIGHT movements inside a block ignore blockWeightKg */
  bodyweight?: boolean;
}

// ---------- Sections (templates) ----------

interface SectionBase {
  id: string; // e.g. "d1-s1"
  title: string; // e.g. "HANDSTAND"
  emphasis?: Emphasis;
  intro?: string; // e.g. "Keep it easy. Hard conditioning follows."
}

export interface SkillSection extends SectionBase {
  type: "SKILL";
  exerciseId: string;
  durationMin: number;
  trackBestHold: boolean;
  trackAttempts?: boolean;
}

export interface StraightSetsSection extends SectionBase {
  type: "STRAIGHT_SETS";
  prescriptions: SetsPrescription[];
}

/** Day 4 style: N untimed rounds; weights may vary per exercise. */
export interface CircuitSection extends SectionBase {
  type: "CIRCUIT";
  rounds: number;
  prescriptions: SetsPrescription[];
}

export interface EmomSection extends SectionBase {
  type: "EMOM";
  minutes: number;
  /** interval length in seconds — 60 = EMOM, 120 = E2MOM… (default 60) */
  intervalSec?: number;
  /** ONE weight for the whole block (null = pure bodyweight block) */
  blockWeightKg: number | null;
  /** repeats every `pattern.length` minutes */
  pattern: TimedMovement[];
}

export interface AmrapSection extends SectionBase {
  type: "AMRAP";
  minutes: number;
  blockWeightKg: number | null;
  round: TimedMovement[];
  /** benchmark blocks are visually flagged for future comparison (spec Day 3) */
  isBenchmark?: boolean;
  benchmarkLabel?: string;
}

/** Day 2 core flow: relaxed rounds, one weight for the entire flow. */
export interface FlowSection extends SectionBase {
  type: "FLOW";
  rounds: number;
  blockWeightKg: number | null;
  movements: TimedMovement[];
}

/** Jump rope style: work/rest intervals. */
export interface IntervalSection extends SectionBase {
  type: "INTERVAL";
  exerciseId: string;
  rounds: number;
  workSec: number;
  restSec: number;
  effort?: string; // "LIGHT effort."
}

// ---------- Free Movement warm-up (movement library + generated sections) ----------

export type WarmupTag =
  | "pulse"
  | "neck"
  | "shoulders"
  | "scapula"
  | "wrists"
  | "spine"
  | "rotation"
  | "hips"
  | "hamstrings"
  | "ankles"
  | "knees"
  | "squat"
  | "lunge"
  | "floor-flow"
  | "compression"
  | "handstand-prep"
  | "pistol-prep"
  | "ring-prep";

/** Reusable warm-up movement definition. Written instructions are MANDATORY. */
export interface WarmupMovement {
  id: string; // stable slug
  name: string;
  shortCue: string; // one-line "what this is"
  instructions: string[]; // step-by-step, enough to perform without googling
  tips?: string[]; // 1–3 technique cues
  durationSeconds: number; // default 30
  tags: WarmupTag[];
  /** only verified, curated URLs — never invented. Absent = written instructions only. */
  videoUrl?: string;
}

export interface WarmupSection extends SectionBase {
  type: "WARMUP";
  /** generated selection, snapshotted into the session */
  movements: Array<{ movementId: string; durationSeconds: number }>;
  targetMinutes: number;
}

export interface WarmupResult {
  completed: boolean;
  /** index of the movement currently being performed */
  currentIndex: number;
  movementsDone: number;
  timer: TimerState; // per-movement segment timer
  note?: Note;
}

// ---------- Calisthenics skill progressions ----------

export type SkillPrescriptionType = "HOLD_SEC" | "REPS" | "ATTEMPTS";

export interface SkillPrescription {
  sets: number;
  reps?: number;
  holdSec?: number;
  attempts?: number;
  perSide?: boolean;
  /** rest between timed holds (guided hold timer); default 45 s */
  restSec?: number;
}

export interface SkillVariation {
  id: string; // stable slug, e.g. "l-sit-tuck"
  level: number; // 1 = easiest within the family; strictly ordered
  name: string;
  shortCue: string;
  instructions: string[]; // starting position, movement/hold, what counts, mandatory
  tips?: string[];
  /** obvious stop/failure condition where relevant */
  stopWhen?: string;
  prescriptionType: SkillPrescriptionType;
  defaultPrescription: SkillPrescription;
  equipment: Equipment[];
  videoUrl?: string;
  scaleNotes?: string;
}

export type SkillCategory =
  | "HANDSTAND"
  | "STATIC_HOLD"
  | "LEGS"
  | "PUSH"
  | "PULL"
  | "RINGS"
  | "LOCOMOTION";

export interface SkillFamily {
  id: string; // stable slug, e.g. "l-sit"
  name: string;
  category: SkillCategory;
  /** false when required equipment hasn't arrived (rings/bar) */
  isAvailable: boolean;
  variations: SkillVariation[]; // ordered by level ascending
}

export interface SkillPracticeSection extends SectionBase {
  type: "SKILL_PRACTICE";
  familyId: string;
  /** originally prescribed variation (immutable in the snapshot) */
  variationId: string;
  prescription: SkillPrescription;
  targetMinutes: number;
}

export interface SkillPracticeResult {
  /** what is currently selected/being performed (Scale Up/Down changes this) */
  selectedVariationId: string;
  /** manual difficulty change relative to the prescribed variation */
  manualAdjustment: "scaled_up" | "scaled_down" | null;
  sets: SetResult[];
  completed: boolean;
  timer: TimerState;
  note?: Note;
}

export type WorkoutSection =
  | SkillSection
  | StraightSetsSection
  | CircuitSection
  | EmomSection
  | AmrapSection
  | FlowSection
  | IntervalSection
  | WarmupSection
  | SkillPracticeSection;

export type TimedSection = EmomSection | AmrapSection | FlowSection;

export function isTimedSection(s: WorkoutSection): s is TimedSection {
  return s.type === "EMOM" || s.type === "AMRAP" || s.type === "FLOW";
}

// ---------- Day template ----------

export interface DayTemplate {
  day: number; // 1..7
  name: string; // "HARD STRENGTH"
  intensity: Intensity;
  emphasis: Emphasis;
  goal: string;
  quote: string;
  isRest?: boolean;
  restSuggestions?: string[];
  sections: WorkoutSection[];
}

// ---------- Notes (first-class, spec §24) ----------

export interface Note {
  id: string;
  text: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ---------- Session results (what actually happened) ----------

export type Difficulty1to5 = 1 | 2 | 3 | 4 | 5;

export interface SetResult {
  setIndex: number; // 0-based
  completed: boolean;
  skipped?: boolean;
  skipReason?: string; // e.g. "SKIPPED — EQUIPMENT SHAPE"
  actualReps?: number;
  actualRepsLeft?: number;
  actualRepsRight?: number;
  actualDurationSec?: number;
  perceivedDifficulty?: Difficulty1to5;
  note?: Note;
}

export interface ExerciseResult {
  prescriptionId: string;
  sets: SetResult[];
  note?: Note;
}

/** One EMOM minute, one AMRAP checkpoint, or one flow-round movement. */
export interface CycleResult {
  index: number; // minute index / round index
  label: string; // "MIN 3 — SWINGS", "ROUND 2 — FIGURE 8"
  completed: boolean;
  actualReps?: number;
  note?: Note;
}

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  status: TimerStatus;
  /** epoch ms when (re)started; undefined unless running */
  startedAt?: number;
  /** accumulated elapsed ms from previous run segments */
  elapsedBeforePauseMs: number;
  /**
   * logical-time offset from manual Skip / ±time adjustments against a
   * TimerPlan. Displayed state is always derived from wall-clock elapsed +
   * this skew, so backgrounding across phases stays accurate.
   */
  skewMs?: number;
}

export interface TimedBlockResult {
  completed: boolean;
  completedMinutes?: number;
  completedRounds?: number;
  extraReps?: number;
  resultSummary?: string; // e.g. "6 rounds + 14 reps"
  perceivedDifficulty?: Difficulty1to5;
  cycles: CycleResult[];
  timer: TimerState;
  note?: Note;
}

export interface SkillResult {
  completed: boolean;
  actualDurationMin?: number;
  bestHoldSec?: number;
  attempts?: number;
  timer: TimerState;
  note?: Note;
}

export interface SectionResult {
  sectionId: string;
  /** STRAIGHT_SETS / CIRCUIT / INTERVAL */
  exercises?: ExerciseResult[];
  /** EMOM / AMRAP / FLOW */
  timedBlock?: TimedBlockResult;
  /** SKILL (legacy free practice — old sessions keep loading) */
  skill?: SkillResult;
  /** WARMUP */
  warmup?: WarmupResult;
  /** SKILL_PRACTICE (progression-based) */
  skillPractice?: SkillPracticeResult;
  /** guided section timer for INTERVAL sections (TimerPlan-driven) */
  sectionTimer?: TimerState;
  note?: Note;
}

export type WorkoutDifficulty = "TOO_EASY" | "RIGHT" | "HARD" | "TOO_HARD";

export interface WorkoutFeedback {
  difficulty: WorkoutDifficulty;
  energy?: Difficulty1to5;
  sorenessBefore?: Difficulty1to5;
  sorenessAfter?: Difficulty1to5;
  pain: boolean;
  painNote?: string;
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  day: number;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  /** set when a completed session was later corrected (edit mode) */
  editedAt?: string; // ISO
  /** Immutable deep copy of the template at start (spec §23). Never mutate. */
  snapshot: DayTemplate;
  /** editable per-session quote (spec §8) */
  quote: string;
  sections: SectionResult[];
  workoutNote?: Note;
  feedback?: WorkoutFeedback;
}

// ---------- Daily tracking (spec §18) ----------

export interface DailyLog {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  waistCm?: number;
  steps?: number;
  sleepHours?: number;
  energy?: Difficulty1to5;
  soreness?: Difficulty1to5;
  proteinG?: number;
  calories?: number;
  note?: Note;
}

// ---------- Food (spec §19; UI deferred past V1 slice) ----------

export interface FoodEntry {
  id: string;
  timestamp: string; // ISO
  description?: string;
  proteinG?: number;
  calories?: number;
  mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  photoPath?: string; // Supabase Storage path
  note?: Note;
}
