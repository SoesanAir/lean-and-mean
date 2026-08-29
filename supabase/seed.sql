-- Lean & Mean — seed data.
-- Transcribed 1:1 from src/lib/seed/exercises.ts and src/lib/seed/week1.ts.
-- Ids match the TypeScript constants exactly.
--
-- ONE WEIGHT PER TIMED SECTION (spec §13): timed sections (EMOM/AMRAP/FLOW)
-- carry block_weight_kg; their TIMED_MOVEMENT prescriptions have weight_kg NULL.

-- ============================================================
-- Exercise library (spec §14)
-- ============================================================

insert into exercises (id, name, category, equipment, is_available, default_grip, purpose, watch_for, common_mistakes) values

-- ---------- Skill ----------
('handstand', 'Handstand', 'SKILL', array['BODYWEIGHT'], true, 'BODYWEIGHT',
  array['balance', 'shoulder stability', 'body control', 'enjoyment'],
  array['Push tall through shoulders', 'Brace abs', 'Squeeze glutes', 'Keep body tight', 'Controlled exits', 'Stop before technique deteriorates'],
  null),

-- ---------- Ballistic / Power ----------
('kb-swing', 'Two-hand Kettlebell Swing', 'BALLISTIC', array['KETTLEBELL'], true, 'HANDLE',
  array['hip power', 'posterior chain', 'conditioning', 'grip'],
  array['Hip-driven, not arm-lifted', 'Neutral spine', 'Bell driven by hips', 'Arms guide rather than lift', 'Stop if technique deteriorates'],
  array['Squatting the swing', 'Rounding the low back', 'Lifting with shoulders']),
('ballistic-row', 'Ballistic Row', 'BALLISTIC', array['KETTLEBELL'], true, 'HANDLE',
  array['explosive pulling', 'back', 'biceps', 'grip', 'athletic power'],
  array['Explosive pull, controlled lowering', 'Square hips', 'Neutral spine'],
  null),

-- ---------- Squat / Legs ----------
('goblet-squat', 'Goblet Squat', 'SQUAT_LEGS', array['KETTLEBELL'], true, 'HORNS',
  array['legs', 'glutes', 'trunk', 'squat pattern'],
  array['Controlled descent', 'Brace', 'Knees track naturally', 'Keep bell close'],
  array['Heels lifting', 'Collapsing chest', 'Bell drifting away from body']),
('slow-goblet-squat', 'Slow Goblet Squat', 'SQUAT_LEGS', array['KETTLEBELL'], true, 'HORNS',
  array['hypertrophy', 'control', 'legs', 'trunk'],
  array['Controlled descent', 'Brace', 'Knees track naturally', 'Keep bell close'],
  null),
('front-rack-reverse-lunge', 'Front-rack Reverse Lunge', 'SQUAT_LEGS', array['KETTLEBELL'], true, 'HANDLE',
  array['legs', 'glutes', 'core', 'anti-rotation'],
  array['Tall torso', 'Controlled descent', 'Front foot planted', 'Resist rotation from offset bell'],
  null),
('deep-squat-curl', 'Deep Squat Curl', 'GRIP_ARMS', array['KETTLEBELL'], true, 'HORNS',
  array['biceps', 'forearms', 'grip', 'hips', 'squat position', 'posture', 'trunk'],
  array['Stable squat', 'Chest controlled', 'Do not bounce', 'Curl deliberately', 'Stop if low-back position becomes poor'],
  null),

-- ---------- Hinge ----------
('single-leg-rdl', 'Single-leg RDL', 'HINGE', array['KETTLEBELL'], true, 'HANDLE',
  array['hamstrings', 'glutes', 'balance', 'hip hinge'],
  array['Square hips', 'Long spine', 'Hip hinge', 'Resist rotation'],
  null),

-- ---------- Pull ----------
('one-arm-row', 'One-arm Row', 'PULL', array['KETTLEBELL'], true, 'HANDLE',
  array['lats', 'upper back', 'biceps', 'grip'],
  array['Do not rotate torso', 'Pull elbow toward hip', 'Control lowering', 'Keep shoulder away from ear'],
  null),
('gorilla-row', 'Gorilla Row', 'PULL', array['DOUBLE_KETTLEBELL'], false, 'HANDLE',
  array['back', 'grip', 'hinge endurance'],
  array['Flat back', 'Row without torso rotation'],
  null),
('renegade-row-push-up', 'Renegade Row + Push-up', 'PULL', array['DOUBLE_KETTLEBELL'], false, 'HANDLE',
  array['chest', 'back', 'anti-rotation', 'trunk stabilization'],
  array['Hips square', 'No rocking', 'Controlled row'],
  null),

-- ---------- Push ----------
('strict-press', 'Strict Press', 'PUSH', array['KETTLEBELL'], true, 'HANDLE',
  array['shoulders', 'triceps', 'overhead strength'],
  array['Brace before press', 'Neutral wrist', 'Do not lean sideways', 'Controlled lockout'],
  null),
('clean-strict-press', 'Clean + Strict Press', 'PUSH', array['KETTLEBELL'], true, 'HANDLE',
  array['shoulders', 'triceps', 'upper body strength', 'trunk stabilization'],
  array['Smooth clean', 'Stable rack', 'Neutral wrist', 'Brace before press', 'Do not lean sideways', 'Controlled lockout'],
  array['Banging the forearm on the clean', 'Pressing before bracing', 'Side lean']),
('floor-press', 'Floor Press', 'PUSH', array['KETTLEBELL'], true, 'HANDLE',
  array['chest', 'triceps', 'shoulder-safe pressing'],
  array['Controlled shoulder', 'Forearm vertical', 'Brace torso', 'Slow lowering'],
  null),
('push-up', 'Push-up', 'PUSH', array['BODYWEIGHT'], true, 'BODYWEIGHT',
  array['chest', 'triceps', 'trunk'],
  array['Rigid plank body', 'Full range', 'Elbows ~45°', 'Stop before form breaks'],
  null),
('ring-dip', 'Ring Dip', 'PUSH', array['RINGS'], false, 'NONE',
  array['chest', 'triceps', 'shoulders', 'hypertrophy'],
  array['Stable turnout', 'Controlled depth'],
  null),
('ring-push-up', 'Ring Push-up', 'PUSH', array['RINGS'], false, 'NONE',
  array['chest', 'stabilization', 'hypertrophy'],
  array['Rings steady', 'Body rigid'],
  null),

-- ---------- Core / Rotation / Stability ----------
('halo', 'Halo', 'CORE', array['KETTLEBELL'], true, 'HORNS',
  array['shoulders', 'trunk control', 'mobility', 'grip'],
  array['Move bell around head rather than simply above it', 'Keep ribs controlled', 'Move slowly', 'Do not force shoulder range', 'Keep grip deliberate'],
  null),
('around-the-world', 'Around the World', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['trunk control', 'grip', 'coordination'],
  array['Smooth hand transfer', 'Tall posture', 'Do not wildly rotate torso', 'Control the bell'],
  null),
('figure-8', 'Figure 8', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['coordination', 'grip', 'hip stability'],
  array['Controlled hand exchange', 'Hips stay stable', 'Do not rush'],
  null),
('low-windmill', 'Low Windmill', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['rotation', 'hamstrings', 'trunk control'],
  array['Hinge rather than collapse', 'Long spine', 'Controlled rotation', 'Move only through comfortable range'],
  null),
('suitcase-carry', 'Suitcase Carry', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['forearms', 'grip', 'obliques', 'anti-side-bending', 'posture'],
  array['Stand tall', 'No leaning', 'Brace abs', 'Walk deliberately', 'Grip hard'],
  null),
('rack-march', 'Rack March', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['anti-rotation', 'trunk', 'shoulder stability'],
  array['No leaning', 'Slow knee lift', 'Hard abdominal brace', 'Stable rack'],
  null),
('north-south-plank-drag', 'North-South Plank Drag', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['anti-rotation', 'abs', 'shoulders', 'chest stabilization'],
  array['Keep hips square', 'Do not rock side to side', 'Drag under control', 'Brace before each pull'],
  null),
('plank-kb-drag', 'Plank Kettlebell Drag', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['anti-rotation', 'abs', 'shoulder stability'],
  array['Hips square', 'Controlled drag'],
  null),
('dead-bug', 'Dead Bug', 'CORE', array['BODYWEIGHT'], true, 'BODYWEIGHT',
  array['core stabilization', 'rib control'],
  array['Low back gently pressed down', 'Slow opposite arm/leg', 'Breathe'],
  null),
('hollow-hold', 'Hollow Hold', 'CORE', array['BODYWEIGHT'], true, 'BODYWEIGHT',
  array['core stabilization', 'handstand carryover'],
  array['Low back pressed to floor', 'Ribs down', 'Stop when shaking breaks position'],
  null),
('side-plank', 'Side Plank', 'CORE', array['BODYWEIGHT'], true, 'BODYWEIGHT',
  array['obliques', 'lateral trunk stability'],
  array['Straight line head to feet', 'Hips high', 'Shoulder stacked'],
  null),
('kb-gravedigger', 'Kettlebell Gravedigger', 'CORE', array['KETTLEBELL'], true, 'HANDLE',
  array['diagonal/rotational strength'],
  array['Controlled diagonal path', 'Brace throughout'],
  null),

-- ---------- Grip / Arms ----------
('horn-curl', 'Horn Curl', 'GRIP_ARMS', array['KETTLEBELL'], true, 'HORNS',
  array['biceps', 'brachialis', 'forearms', 'grip'],
  array['Keep elbows mostly fixed', 'Do not swing body', 'Controlled lowering', 'Squeeze deliberately at top'],
  null),
('bottom-up-hold', 'Bottom-up Hold', 'GRIP_ARMS', array['KETTLEBELL'], true, 'BOTTOM_UP_HANDLE',
  array['forearms', 'grip', 'wrist stability', 'shoulder stabilization'],
  array['Crush the handle', 'Neutral wrist', 'Stable shoulder', 'Bell balanced vertically', 'Stop before control is lost'],
  null),
('ball-squeeze-hold', 'Ball Squeeze Hold', 'GRIP_ARMS', array['KETTLEBELL'], true, 'BALL',
  array['forearms', 'hand strength', 'crush grip'],
  array['Cup/grip bell body securely', 'Keep bell close to torso', 'Static controlled hold', 'Do NOT use this grip for ballistic work'],
  null),

-- ---------- Conditioning ----------
('jump-rope', 'Jump Rope', 'CONDITIONING', array['JUMP_ROPE'], true, 'NONE',
  array['conditioning', 'footwork', 'calves'],
  array['Relaxed shoulders', 'Small hops', 'Wrists spin the rope'],
  null),

-- ---------- Future: bar / rings ----------
('pull-up', 'Pull-up', 'PULL', array['PULLUP_BAR'], false, 'NONE',
  array['lats', 'back', 'biceps', 'grip'],
  array['Full hang to chin over bar', 'No kipping (strict)'],
  null),
('chin-up', 'Chin-up', 'PULL', array['PULLUP_BAR'], false, 'NONE',
  array['biceps', 'lats', 'grip'],
  array['Full range', 'Controlled lowering'],
  null),
('muscle-up', 'Muscle-up', 'PULL', array['PULLUP_BAR', 'RINGS'], false, 'NONE',
  array['pull-to-push transition', 'upper body power'],
  array['Earn it after strict pull-ups and dips'],
  null),
('ring-row', 'Ring Row', 'PULL', array['RINGS'], false, 'NONE',
  array['back', 'scapular control'],
  array['Rigid body line', 'Full squeeze at top'],
  null);

-- ============================================================
-- Week 1 templates (spec §16)
-- ============================================================

insert into workout_templates (id, day, name, intensity, emphasis, goal, quote, is_rest, rest_suggestions) values
('day-1', 1, 'HARD STRENGTH', 'HARD', 'QUALITY',
  'Full-body strength, shoulder development, pulling strength and anti-rotation.',
  'Strong reps. No garbage reps.', false, null),
('day-2', 2, 'LIGHT CORE + ENGINE', 'LIGHT', 'SKILL',
  'Core control, rotation, anti-rotation, movement practice and easy conditioning.',
  'Easy days make hard days possible.', false, null),
('day-3', 3, 'HARD CONDITIONING', 'HARD', 'OUTPUT',
  'Power and measurable full-body conditioning.',
  'Today we measure.', false, null),
('day-4', 4, 'MEDIUM MUSCLE + STABILITY', 'MEDIUM', 'VOLUME',
  'Hypertrophy, chest/upper-body development, biceps, legs and stabilization.',
  'Build muscle. Don''t chase exhaustion.', false, null),
('day-5', 5, 'LIGHT SKILL + CORE + FOREARMS', 'LIGHT', 'SKILL',
  'Handstand development, shoulder health, rotational core work, arms, grip and active recovery.',
  'Practice, don''t prove.', false, null),
('day-6', 6, 'MEDIUM FULL BODY', 'MEDIUM', 'VOLUME',
  'Full-body work capacity without becoming another maximum conditioning day.',
  'Smooth is fast.', false, null),
('day-7', 7, 'REST / RECOVERY', 'REST', 'SKILL',
  'Recover. More training is useful only if recovery remains good.',
  'Rest is part of the program.', true,
  array['Walk', 'Eat sufficient protein', 'Sleep', 'Light mobility if desired']);

-- ============================================================
-- Sections
-- (id, template_id, position, section_type, title, emphasis, intro,
--  minutes, rounds, work_sec, rest_sec, block_weight_kg, skill_exercise_id,
--  track_best_hold, track_attempts, effort, is_benchmark, benchmark_label)
-- ============================================================

insert into template_sections
  (id, template_id, position, section_type, title, emphasis, intro,
   minutes, rounds, work_sec, rest_sec, block_weight_kg, skill_exercise_id,
   track_best_hold, track_attempts, effort, is_benchmark, benchmark_label) values

-- ---------- Day 1: HARD STRENGTH ----------
('d1-s1', 'day-1', 1, 'SKILL', 'HANDSTAND', 'SKILL', null,
  8, null, null, null, null, 'handstand', true, false, null, false, null),
('d1-s2', 'day-1', 2, 'STRAIGHT_SETS', 'HALO', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d1-s3', 'day-1', 3, 'STRAIGHT_SETS', 'CLEAN + STRICT PRESS', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d1-s4', 'day-1', 4, 'STRAIGHT_SETS', 'FRONT-RACK REVERSE LUNGE', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d1-s5', 'day-1', 5, 'STRAIGHT_SETS', 'ONE-ARM ROW', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d1-s6', 'day-1', 6, 'STRAIGHT_SETS', 'SUITCASE CARRY', null, null,
  null, null, null, null, null, null, false, false, null, false, null),

-- ---------- Day 2: LIGHT CORE + ENGINE ----------
('d2-s1', 'day-2', 1, 'FLOW', 'CORE FLOW', null,
  '3 relaxed rounds. 12 kg for the entire flow.',
  null, 3, null, null, 12, null, false, false, null, false, null),
('d2-s2', 'day-2', 2, 'EMOM', 'EASY SWING EMOM', null,
  'Easy aerobic power practice. Rest the remainder of each minute. Do NOT turn this into hard conditioning.',
  10, null, null, null, 20, null, false, false, null, false, null),
('d2-s3', 'day-2', 3, 'INTERVAL', 'JUMP ROPE', null, null,
  null, 6, 30, 60, null, 'jump-rope', false, false, 'LIGHT effort.', false, null),

-- ---------- Day 3: HARD CONDITIONING ----------
('d3-s1', 'day-3', 1, 'SKILL', 'HANDSTAND', 'SKILL',
  'Keep it easy. Hard conditioning follows.',
  5, null, null, null, null, 'handstand', true, false, null, false, null),
('d3-s2', 'day-3', 2, 'EMOM', 'SWING POWER EMOM', null, null,
  6, null, null, null, 24, null, false, false, null, false, null),
('d3-s3', 'day-3', 3, 'AMRAP', 'WEEK 1 BASELINE AMRAP', null, null,
  8, null, null, null, 20, null, false, false, null, true,
  'WEEK 1 BASELINE — compare against Week 10'),

-- ---------- Day 4: MEDIUM MUSCLE + STABILITY ----------
('d4-s1', 'day-4', 1, 'CIRCUIT', 'ROUND WORK A', null,
  '2 rounds in Week 1. NOT timed. Weights may change between exercises.',
  null, 2, null, null, null, null, false, false, null, false, null),
('d4-s2', 'day-4', 2, 'STRAIGHT_SETS', 'HORN CURL', null,
  'Dedicated direct arm work. Default Week 1: 12 kg (range 12–16 kg). Track every set separately.',
  null, null, null, null, null, null, false, false, null, false, null),
('d4-s3', 'day-4', 3, 'CIRCUIT', 'ROUND WORK B', null,
  '2 rounds. NOT timed.',
  null, 2, null, null, null, null, false, false, null, false, null),

-- ---------- Day 5: LIGHT SKILL + CORE + FOREARMS ----------
('d5-s1', 'day-5', 1, 'SKILL', 'HANDSTAND PRACTICE', null,
  'This session should leave you feeling better rather than destroyed.',
  15, null, null, null, null, 'handstand', true, true, null, false, null),
('d5-s2', 'day-5', 2, 'STRAIGHT_SETS', 'HALO', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s3', 'day-5', 3, 'STRAIGHT_SETS', 'AROUND THE WORLD', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s4', 'day-5', 4, 'STRAIGHT_SETS', 'DEEP SQUAT CURL', null,
  'Stay in a comfortable deep squat while curling.',
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s5', 'day-5', 5, 'STRAIGHT_SETS', 'NORTH-SOUTH PLANK DRAG', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s6', 'day-5', 6, 'STRAIGHT_SETS', 'BOTTOM-UP HOLD', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s7', 'day-5', 7, 'STRAIGHT_SETS', 'BALL SQUEEZE HOLD', null,
  'Default 8–12 kg; Week 1: 8 kg for 20–30 s. If the bell shape cannot be safely held by the body, mark SKIPPED — EQUIPMENT SHAPE with a note.',
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s8', 'day-5', 8, 'STRAIGHT_SETS', 'DEAD BUG', null, null,
  null, null, null, null, null, null, false, false, null, false, null),
('d5-s9', 'day-5', 9, 'STRAIGHT_SETS', 'HOLLOW HOLD', null, null,
  null, null, null, null, null, null, false, false, null, false, null),

-- ---------- Day 6: MEDIUM FULL BODY ----------
('d6-s1', 'day-6', 1, 'EMOM', 'MAIN EMOM', null,
  'The entire EMOM uses the SAME 16 kg kettlebell. Five cycles of three minutes.',
  15, null, null, null, 16, null, false, false, null, false, null),
('d6-s2', 'day-6', 2, 'STRAIGHT_SETS', 'PUSH-UPS', null,
  'Stop approximately 2 clean reps before failure.',
  null, null, null, null, null, null, false, false, null, false, null),
('d6-s3', 'day-6', 3, 'STRAIGHT_SETS', 'SUITCASE CARRY', null, null,
  null, null, null, null, null, null, false, false, null, false, null);

-- Day 7 (REST / RECOVERY) has no sections.

-- ============================================================
-- Prescriptions
-- (id, section_id, position, exercise_id, kind, display_name, grip, grip_notes,
--  sets, reps, per_side, each_direction, duration_sec, tempo, weight_kg,
--  is_bodyweight, watch_for)
-- TIMED_MOVEMENT rows always have weight_kg NULL (one weight per timed section).
-- ============================================================

insert into template_prescriptions
  (id, section_id, position, exercise_id, kind, display_name, grip, grip_notes,
   sets, reps, per_side, each_direction, duration_sec, tempo, weight_kg,
   is_bodyweight, watch_for) values

-- ---------- Day 1 ----------
('d1-halo', 'd1-s2', 1, 'halo', 'SETS', null, 'HORNS', null,
  2, '5', false, true, null, null, 12, false, null),
('d1-clean-press', 'd1-s3', 1, 'clean-strict-press', 'SETS', null, 'HANDLE', null,
  3, '5', true, false, null, null, 16, false, null),
('d1-lunge', 'd1-s4', 1, 'front-rack-reverse-lunge', 'SETS', null, 'HANDLE', 'Rack position',
  3, '6', true, false, null, null, 20, false, null),
('d1-row', 'd1-s5', 1, 'one-arm-row', 'SETS', null, 'HANDLE', null,
  3, '10', true, false, null, null, 20, false, null),
('d1-carry', 'd1-s6', 1, 'suitcase-carry', 'SETS', null, 'HANDLE', null,
  3, null, true, false, 30, null, 24, false, null),

-- ---------- Day 2 ----------
-- CORE FLOW (block weight 12 kg on section d2-s1)
('d2-atw', 'd2-s1', 1, 'around-the-world', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '6', false, true, null, null, null, false, null),
('d2-fig8', 'd2-s1', 2, 'figure-8', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '6', false, true, null, null, null, false, null),
('d2-windmill', 'd2-s1', 3, 'low-windmill', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '5', true, false, null, null, null, false, null),
('d2-halo', 'd2-s1', 4, 'halo', 'TIMED_MOVEMENT', null, 'HORNS', null,
  null, '5', false, true, null, null, null, false, null),
-- EASY SWING EMOM (block weight 20 kg on section d2-s2)
('d2-swing', 'd2-s2', 1, 'kb-swing', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '6', false, false, null, null, null, false,
  array['Hip-driven', 'Neutral spine', 'Relax shoulders', 'Strong handle grip', 'Controlled breathing']),

-- ---------- Day 3 ----------
-- SWING POWER EMOM (block weight 24 kg on section d3-s2)
('d3-swing', 'd3-s2', 1, 'kb-swing', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '8', false, false, null, null, null, false,
  array['Explosive hips', 'Neutral spine', 'Bell driven by hips', 'Arms guide rather than lift', 'Stop if technique deteriorates']),
-- WEEK 1 BASELINE AMRAP (block weight 20 kg on section d3-s3)
('d3-swings', 'd3-s3', 1, 'kb-swing', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '8', false, false, null, null, null, false, null),
('d3-goblet', 'd3-s3', 2, 'goblet-squat', 'TIMED_MOVEMENT', null, 'HORNS', null,
  null, '6', false, false, null, null, null, false, null),
('d3-pushup', 'd3-s3', 3, 'push-up', 'TIMED_MOVEMENT', null, 'BODYWEIGHT', null,
  null, '6', false, false, null, null, null, true, null),
('d3-row', 'd3-s3', 4, 'one-arm-row', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '6', true, false, null, null, null, false, null),

-- ---------- Day 4 ----------
-- ROUND WORK A (untimed circuit; weights vary per exercise)
('d4-halo', 'd4-s1', 1, 'halo', 'SETS', null, 'HORNS', null,
  1, '5', false, true, null, null, 12, false, null),
('d4-rdl', 'd4-s1', 2, 'single-leg-rdl', 'SETS', null, 'HANDLE', null,
  1, '8', true, false, null, null, 20, false, null),
('d4-slow-goblet', 'd4-s1', 3, 'slow-goblet-squat', 'SETS', null, 'HORNS', null,
  1, '10', false, false, null, '3 seconds down', 24, false, null),
('d4-floor-press', 'd4-s1', 4, 'floor-press', 'SETS', null, 'HANDLE', null,
  1, '8', true, false, null, null, 20, false, null),
-- HORN CURL
('d4-horn-curl', 'd4-s2', 1, 'horn-curl', 'SETS', null, 'HORNS', null,
  3, '8–12', false, false, null, null, 12, false, null),
-- ROUND WORK B
('d4-row', 'd4-s3', 1, 'one-arm-row', 'SETS', null, 'HANDLE', null,
  1, '10', true, false, null, null, 20, false, null),
('d4-rack-march', 'd4-s3', 2, 'rack-march', 'SETS', null, 'HANDLE', 'Rack position',
  1, null, true, false, 30, null, 20, false, null),
('d4-side-plank', 'd4-s3', 3, 'side-plank', 'SETS', null, 'BODYWEIGHT', null,
  1, null, true, false, 30, null, null, false, null),

-- ---------- Day 5 ----------
('d5-halo', 'd5-s2', 1, 'halo', 'SETS', null, 'HORNS', null,
  3, '5', false, true, null, null, 12, false, null),
('d5-atw', 'd5-s3', 1, 'around-the-world', 'SETS', null, 'HANDLE', null,
  3, '8', false, true, null, null, 12, false, null),
('d5-dsc', 'd5-s4', 1, 'deep-squat-curl', 'SETS', null, 'HORNS', null,
  2, '6–8', false, false, null, null, 12, false, null),
('d5-nsdrag', 'd5-s5', 1, 'north-south-plank-drag', 'SETS', null, 'HANDLE', 'Handle when moving bell',
  3, '6', false, false, null, null, 12, false, null),
('d5-buh', 'd5-s6', 1, 'bottom-up-hold', 'SETS', null, 'BOTTOM_UP_HANDLE', null,
  3, null, true, false, 20, null, 8, false, null),
('d5-ball', 'd5-s7', 1, 'ball-squeeze-hold', 'SETS', null, 'BALL', null,
  2, null, false, false, 30, null, 8, false, null),
('d5-deadbug', 'd5-s8', 1, 'dead-bug', 'SETS', null, 'BODYWEIGHT', null,
  3, '8', true, false, null, null, null, false, null),
('d5-hollow', 'd5-s9', 1, 'hollow-hold', 'SETS', null, 'BODYWEIGHT', null,
  3, null, false, false, 20, null, null, false, null),

-- ---------- Day 6 ----------
-- MAIN EMOM (block weight 16 kg on section d6-s1)
('d6-cp', 'd6-s1', 1, 'clean-strict-press', 'TIMED_MOVEMENT', 'Clean + Press — 3/side', 'HANDLE', null,
  null, '6', false, false, null, null, null, false, null),
('d6-goblet', 'd6-s1', 2, 'goblet-squat', 'TIMED_MOVEMENT', null, 'HORNS', null,
  null, '8', false, false, null, null, null, false, null),
('d6-swing', 'd6-s1', 3, 'kb-swing', 'TIMED_MOVEMENT', null, 'HANDLE', null,
  null, '10', false, false, null, null, null, false, null),
-- PUSH-UPS
('d6-pushup', 'd6-s2', 1, 'push-up', 'SETS', null, 'BODYWEIGHT', null,
  3, 'stop ~2 before failure', false, false, null, null, null, false, null),
-- SUITCASE CARRY
('d6-carry', 'd6-s3', 1, 'suitcase-carry', 'SETS', null, 'HANDLE', null,
  3, null, true, false, 30, null, 24, false, null);
