import type { WarmupMovement } from "../types";

// Free Movement warm-up library.
//
// Written instructions are MANDATORY for every movement: each entry must let
// someone who has never heard the name perform it correctly without googling.
// `videoUrl` only ever holds verified, curated links — never invented ones.
// No links have been curated yet, so the field is absent everywhere and the UI
// falls back to a YouTube search.

export const WARMUP_MOVEMENTS: WarmupMovement[] = [
  // ---------- Pulse raisers ----------
  {
    id: "body-bounces",
    name: "Body Bounces",
    shortCue: "Light rhythmic bouncing on the spot to raise temperature",
    instructions: [
      "Stand tall with feet hip-width apart, arms relaxed at your sides.",
      "Start bouncing gently on the balls of your feet — heels kiss the floor between bounces, they don't have to stay up.",
      "Let the bounce travel through the whole body: knees soft, shoulders loose, arms jiggling freely.",
      "Keep a quick, springy rhythm — roughly two bounces per second — and breathe easy.",
      "Optionally shake out the arms and roll the shoulders while you bounce.",
    ],
    tips: [
      "Stay springy and quiet — this is a bounce, not a jump.",
      "Don't lock the knees; let them absorb each landing.",
    ],
    durationSeconds: 30,
    tags: ["pulse", "ankles"],
  },
  {
    id: "ankle-bounces",
    name: "Ankle Bounces",
    shortCue: "Small straight-leg hops driven purely from the ankles and calves",
    instructions: [
      "Stand tall with feet hip-width apart and legs almost straight — knees soft but not bending to jump.",
      "Bounce off the balls of your feet using only the ankles and calves, leaving the ground just an inch or two.",
      "Land on the balls of the feet and rebound immediately — spend as little time on the ground as possible.",
      "Keep a fast, elastic rhythm and stay tall through the whole body.",
    ],
    tips: [
      "The knees stay quiet — if they're pumping, you're jumping instead of bouncing.",
      "Think of the ankles as springs: quick, stiff contacts.",
    ],
    durationSeconds: 30,
    tags: ["pulse", "ankles"],
  },

  // ---------- Neck / shoulders / scapula ----------
  {
    id: "neck-circles",
    name: "Neck Circles",
    shortCue: "Slow controlled circles with the head to loosen the neck",
    instructions: [
      "Stand or sit tall with shoulders relaxed and down.",
      "Drop your chin toward your chest, then slowly roll your head toward one shoulder, back, to the other shoulder, and forward again — one smooth circle.",
      "Keep the circle slow and continuous, easing gently through any tight spots.",
      "After a few circles, reverse direction for the same number.",
    ],
    tips: [
      "Move slowly — momentum here does nothing useful.",
      "Keep the shoulders still; only the head travels.",
    ],
    durationSeconds: 30,
    tags: ["neck", "spine"],
  },
  {
    id: "arm-swings",
    name: "Arm Swings",
    shortCue: "Swing both arms wide open, then across the chest, in a loose rhythm",
    instructions: [
      "Stand tall with feet hip-width apart and arms out to the sides at shoulder height.",
      "Swing both arms horizontally across your chest so they cross each other, giving your upper back a light hug.",
      "Immediately swing them back open as wide as they'll comfortably go, chest stretching open.",
      "Alternate which arm crosses on top each rep and keep a relaxed, continuous rhythm.",
      "Let the range grow a little with each swing.",
    ],
    tips: [
      "Stay loose — the arms should feel like ropes, not levers.",
      "Don't shrug; keep the shoulders away from the ears.",
    ],
    durationSeconds: 30,
    tags: ["shoulders", "scapula"],
  },
  {
    id: "shoulder-circles",
    name: "Shoulder Circles",
    shortCue: "Big slow circles with straight arms to warm the whole shoulder",
    instructions: [
      "Stand tall with arms hanging straight at your sides.",
      "Sweep both straight arms forward, up past your ears, back, and down — one big full circle.",
      "Keep the arms long and the circles as large as your shoulders comfortably allow.",
      "After several circles, reverse direction: back, up, forward, down.",
      "Keep a steady, unhurried rhythm and let the range grow each rep.",
    ],
    tips: [
      "Brush the ears at the top — reach for full range, not speed.",
      "Keep the ribs down; don't arch the lower back to fake shoulder range.",
    ],
    durationSeconds: 30,
    tags: ["shoulders", "scapula"],
  },
  {
    id: "scapular-circles",
    name: "Scapular Circles",
    shortCue: "Roll the shoulder blades in full circles without moving the arms",
    instructions: [
      "Stand tall with arms relaxed at your sides — the arms stay passive the whole time.",
      "Lift both shoulders up toward your ears, then draw them back, squeezing the shoulder blades together.",
      "Continue the circle by pulling the shoulders down, then rounding them forward — one smooth loop.",
      "Keep circling slowly, making each pass a little bigger, then reverse direction.",
    ],
    tips: [
      "Isolate the shoulder blades — the elbows and hands shouldn't be doing anything.",
      "Hit all four points of the circle deliberately: up, back, down, forward.",
    ],
    durationSeconds: 30,
    tags: ["scapula", "handstand-prep", "shoulders"],
  },
  {
    id: "scapular-push-ups",
    name: "Scapular Push-ups",
    shortCue: "In a plank, pinch and spread the shoulder blades with straight arms",
    instructions: [
      "Set up in a straight-arm plank: hands under shoulders, body in one rigid line from head to heels.",
      "Keeping the elbows completely locked, let your chest sink toward the floor by pinching the shoulder blades together.",
      "Then push the floor away hard, spreading the shoulder blades apart and doming the upper back slightly.",
      "Pulse between these two positions in a steady rhythm — the only movement is between the shoulder blades.",
      "Scale to knees or hands-on-a-bench if a full plank is too demanding.",
    ],
    tips: [
      "Elbows never bend — if they do, it's become a push-up.",
      "Keep the hips still and the core braced; don't sag or pike.",
    ],
    durationSeconds: 30,
    tags: ["scapula", "handstand-prep", "shoulders", "wrists"],
  },

  // ---------- Wrists ----------
  {
    id: "wrist-circles",
    name: "Wrist Circles",
    shortCue: "Interlace the fingers and roll the wrists through full circles",
    instructions: [
      "Stand comfortably and interlace your fingers in front of your chest.",
      "Roll both wrists together in slow, full circles, letting each wrist take turns leading.",
      "Explore the whole range — you should feel gentle movement through every angle of the wrist.",
      "After several circles, reverse direction for the same amount of time.",
    ],
    tips: [
      "Slow beats fast — chase smooth full circles, not speed.",
      "Keep the grip between the hands relaxed.",
    ],
    durationSeconds: 30,
    tags: ["wrists", "handstand-prep"],
  },
  {
    id: "wrist-rocks",
    name: "Wrist Rocks",
    shortCue: "On all fours, rock weight over the hands to load the wrists gently",
    instructions: [
      "Come to all fours with hands flat under your shoulders, fingers spread and pointing forward.",
      "Keeping arms straight, rock your shoulders forward past your hands, letting the wrists bend deeper.",
      "Rock back to the start, then repeat in a smooth, continuous rhythm.",
      "After a while, turn the fingers out to the sides, then toward your knees, and rock in each position.",
      "Only rock as far as the wrists tolerate comfortably — the range will grow as they warm up.",
    ],
    tips: [
      "Keep the palms fully glued to the floor, especially the base of the index finger.",
      "Small pulses first, bigger rocks later — don't force end range cold.",
    ],
    durationSeconds: 30,
    tags: ["wrists", "handstand-prep"],
  },

  // ---------- Spine / rotation ----------
  {
    id: "full-body-twists",
    name: "Full-body Twists",
    shortCue: "Loose standing rotations letting the arms whip around the body",
    instructions: [
      "Stand with feet slightly wider than hip-width, knees soft, arms fully relaxed.",
      "Rotate your torso side to side, letting the loose arms whip around and wrap against your body.",
      "Allow the hips and trail heel to pivot naturally with each turn.",
      "Build a steady rhythm and let the rotation get a little bigger each rep.",
    ],
    tips: [
      "The arms are dead weight — the torso turns them, not the other way round.",
      "Stay tall; don't lean side to side while twisting.",
    ],
    durationSeconds: 30,
    tags: ["rotation", "spine", "hips"],
  },
  {
    id: "cat-cow",
    name: "Cat-Cow",
    shortCue: "On all fours, alternate arching and rounding the whole spine",
    instructions: [
      "Come to all fours: hands under shoulders, knees under hips.",
      "Inhale into 'cow': drop the belly, lift the chest and tailbone, and look gently forward.",
      "Exhale into 'cat': push the floor away, round the whole spine up to the ceiling, tuck the tailbone and drop the head.",
      "Flow between the two positions with the breath, moving segment by segment through the spine.",
      "Keep the rhythm slow and wave-like rather than snapping between endpoints.",
    ],
    tips: [
      "Try to move every vertebra, not just the easy middle ones.",
      "Keep the arms straight and push the floor away in the cat position.",
    ],
    durationSeconds: 30,
    tags: ["spine", "scapula", "floor-flow"],
  },
  {
    id: "thread-the-needle",
    name: "Thread the Needle",
    shortCue: "From all fours, sweep one arm under the body, then open it to the sky",
    instructions: [
      "Start on all fours: hands under shoulders, knees under hips.",
      "Sweep your right arm underneath your body toward the left, letting the right shoulder and ear lower toward the floor.",
      "Then unwind: pull the arm back out and reach it up toward the ceiling, opening the chest and following the hand with your eyes.",
      "Flow between the under-reach and the sky-reach in a continuous rhythm.",
      "Switch arms halfway through.",
    ],
    tips: [
      "Keep the hips stacked over the knees — the rotation comes from the upper back.",
      "Exhale as you thread under, inhale as you open up.",
    ],
    durationSeconds: 30,
    tags: ["spine", "rotation", "shoulders", "floor-flow"],
  },
  {
    id: "thoracic-rotations",
    name: "Thoracic Rotations",
    shortCue: "On all fours, hand behind head, rotate the upper back open and closed",
    instructions: [
      "Come to all fours and place your right hand behind your head, elbow pointing out.",
      "Rotate your upper back to bring the right elbow down toward your left wrist.",
      "Reverse the motion and rotate open, pointing the elbow up toward the ceiling as far as your upper back allows.",
      "Move steadily between the two endpoints, exhaling as you close, inhaling as you open.",
      "Switch sides halfway through.",
    ],
    tips: [
      "Keep the hips square and still — rotate from the ribcage, not the lower back.",
      "Follow the moving elbow with your eyes to bring the neck along.",
    ],
    durationSeconds: 30,
    tags: ["spine", "rotation"],
  },
  {
    id: "bridge-pose",
    name: "Bridge Lifts",
    shortCue: "Lying on your back, drive the hips up into a bridge and lower with control",
    instructions: [
      "Lie on your back with knees bent, feet flat on the floor hip-width apart and close to your glutes, arms at your sides.",
      "Press through the feet and squeeze the glutes to lift the hips as high as they'll comfortably go.",
      "At the top, open the chest and push the hips toward the ceiling for a brief one-count.",
      "Lower back down with control, rolling the spine onto the floor from top to bottom.",
      "Repeat in a smooth rhythm — lift, brief top squeeze, controlled descent.",
    ],
    tips: [
      "Drive with the glutes, not the lower back — you should feel this behind you, not in your spine.",
      "Keep the knees tracking straight ahead, not flaring out.",
    ],
    durationSeconds: 30,
    tags: ["hips", "spine", "shoulders"],
  },
  {
    id: "tabletop-pose",
    name: "Reverse Tabletop Lifts",
    shortCue: "Seated with hands behind you, lift the hips to a flat tabletop and lower",
    instructions: [
      "Sit on the floor with knees bent, feet flat, and hands behind you on the floor, fingers pointing toward your feet.",
      "Press through hands and feet to lift your hips until torso and thighs form one flat 'table' parallel to the floor.",
      "Open the chest, squeeze the glutes, and let the head follow the line of the spine.",
      "Lower the hips back down with control until they hover just above the floor.",
      "Pulse between the lifted and lowered positions in a steady rhythm.",
    ],
    tips: [
      "Push the floor away through the hands — don't hang in the shoulders.",
      "If the wrists complain, turn the fingers out to the sides.",
    ],
    durationSeconds: 30,
    tags: ["shoulders", "wrists", "hips"],
  },
  {
    id: "crab-reach",
    name: "Crab Reach",
    shortCue: "From a crab position, lift the hips and reach one arm overhead behind you",
    instructions: [
      "Sit with knees bent, feet flat, hands on the floor behind you with fingers pointing away from your body — the 'crab' position, hips hovering.",
      "Drive the hips up while reaching your right arm up and over your head, following the hand with your eyes.",
      "Let the chest and hips open fully toward the ceiling at the top of the reach.",
      "Lower the hips and return the hand to the floor, then repeat with the left arm.",
      "Alternate sides in a continuous, flowing rhythm.",
    ],
    tips: [
      "Squeeze the glutes at the top — the higher the hips, the better the opening.",
      "Reach long through the fingertips rather than just flopping the arm back.",
    ],
    durationSeconds: 30,
    tags: ["shoulders", "spine", "hips", "floor-flow"],
  },

  // ---------- Hips ----------
  {
    id: "hip-cars",
    name: "Hip CARs",
    shortCue: "Standing on one leg, draw the biggest slow circle you can with the other knee",
    instructions: [
      "Stand tall next to a wall or chair for balance and shift your weight onto one leg.",
      "Lift the other knee up in front of you as high as it comfortably goes.",
      "Keeping the torso still, sweep the knee out to the side, then rotate the hip so the foot swings back and behind you, and return to standing.",
      "That's one full circle — repeat slowly, then reverse the direction.",
      "Switch legs halfway through.",
    ],
    tips: [
      "Slow and controlled — the circle should take several seconds, not one.",
      "Keep the standing side and torso rock still; all the movement is in the working hip.",
    ],
    durationSeconds: 30,
    tags: ["hips", "rotation"],
  },
  {
    id: "leg-swings-front-back",
    name: "Leg Swings (Front-Back)",
    shortCue: "Holding support, swing a straight leg forward and back like a pendulum",
    instructions: [
      "Stand side-on to a wall or sturdy support, holding it with your inside hand.",
      "Swing the outside leg forward and up, keeping it fairly straight, then let it swing back behind you.",
      "Keep the torso tall and let the leg move like a pendulum — relaxed, rhythmic, gradually bigger.",
      "Switch legs halfway through.",
    ],
    tips: [
      "Let momentum do the work — don't muscle the leg up.",
      "Don't round or arch the back to fake extra range.",
    ],
    durationSeconds: 30,
    tags: ["hips", "hamstrings"],
  },
  {
    id: "leg-swings-lateral",
    name: "Leg Swings (Lateral)",
    shortCue: "Facing support, swing a straight leg side to side across the body",
    instructions: [
      "Face a wall or sturdy support and rest both hands on it.",
      "Swing one leg out to the side, then let it swing back across the front of your standing leg.",
      "Keep the hips level and the torso quiet — the leg sweeps like a windscreen wiper.",
      "Build the range gradually with each swing, then switch legs halfway through.",
    ],
    tips: [
      "Keep the toes of the swinging foot pointing forward, not turning open.",
      "Stay tall — don't lean away from the swing to cheat range.",
    ],
    durationSeconds: 30,
    tags: ["hips", "squat"],
  },
  {
    id: "ninety-ninety-switches",
    name: "90/90 Switches",
    shortCue: "Seated with both knees bent at 90 degrees, sweep the knees side to side",
    instructions: [
      "Sit on the floor with your right leg bent 90 degrees in front of you and your left leg bent 90 degrees to the side behind you.",
      "Sit tall, then lift both knees off the floor and sweep them together over to the other side.",
      "Land in the mirror position — left leg in front, right leg behind — and settle both knees toward the floor.",
      "Keep switching side to side in a controlled rhythm, using hands behind you for support if needed.",
      "As it warms up, try switching with less and less hand support.",
    ],
    tips: [
      "Stay as tall as you can through the switch — don't collapse backward.",
      "Move the knees together like windscreen wipers; don't drag one leg at a time.",
    ],
    durationSeconds: 30,
    tags: ["hips", "rotation", "floor-flow"],
  },
  {
    id: "frog-rocks",
    name: "Frog Rocks",
    shortCue: "On all fours with knees wide, rock the hips back toward the heels",
    instructions: [
      "Start on all fours, then slide your knees out wide, feet in line with the knees and inner edges of the feet on the floor.",
      "Rest on your forearms or keep arms straight, whatever height feels workable.",
      "Rock your hips back toward your heels until you feel a stretch through the inner thighs.",
      "Rock forward to the start and keep rocking back and forth in a smooth rhythm.",
      "Let each rock drift slightly deeper as the hips open up.",
    ],
    tips: [
      "Keep the back flat — don't round the lower back to fake depth.",
      "It should feel like a stretch, never a pinch; narrow the knees if it pinches.",
    ],
    durationSeconds: 30,
    tags: ["hips", "squat", "floor-flow"],
  },
  {
    id: "adductor-rock-backs",
    name: "Adductor Rock-backs",
    shortCue: "On all fours with one leg out to the side, rock back into the inner thigh",
    instructions: [
      "Start on all fours, then straighten your right leg out to the side, foot flat or inner edge on the floor, in line with your knee.",
      "Keeping the back flat, rock your hips back toward your left heel until you feel a stretch along the right inner thigh.",
      "Rock forward to the start and keep pulsing back and forth rhythmically.",
      "Switch legs halfway through.",
    ],
    tips: [
      "Push the hips straight back, not down — a flat back keeps the stretch in the adductor.",
      "Keep the extended-leg knee straight throughout.",
    ],
    durationSeconds: 30,
    tags: ["hips", "squat", "floor-flow"],
  },
  {
    id: "straddle-rocks",
    name: "Straddle Rocks",
    shortCue: "Seated in a wide straddle, rock the torso forward and side to side",
    instructions: [
      "Sit on the floor with legs straight and spread wide into a comfortable straddle, toes pointing up.",
      "Sit as tall as you can, hands on the floor in front of you for support.",
      "Walk the hands forward and rock your torso gently forward and back, staying tall through the spine.",
      "Then rock side to side, drifting the chest toward one knee, back through the middle, and over to the other knee.",
      "Keep everything pulsing and moving — this is rocking, not a held stretch.",
    ],
    tips: [
      "Hinge from the hips with a long spine — rounding forward wastes the movement.",
      "Keep the kneecaps and toes pointing at the ceiling.",
    ],
    durationSeconds: 30,
    tags: ["hamstrings", "hips", "compression", "floor-flow"],
  },

  // ---------- Hamstrings ----------
  {
    id: "toe-touches",
    name: "Dynamic Toe Touches",
    shortCue: "Rhythmic standing fold-and-reach toward the toes, up and down",
    instructions: [
      "Stand tall with feet hip-width apart and legs straight but not locked.",
      "Hinge at the hips and fold down, reaching your hands toward your toes as far as comfortable.",
      "Rise all the way back up to standing, reaching the arms overhead with a slight chest opening.",
      "Keep flowing between the fold and the overhead reach in a steady rhythm.",
      "Let the fold get slightly deeper on each rep without bouncing hard at the bottom.",
    ],
    tips: [
      "Soft knees are fine — feel the hamstrings, not the lower back.",
      "Smooth and rhythmic; no aggressive bouncing at end range.",
    ],
    durationSeconds: 30,
    tags: ["hamstrings", "spine"],
  },
  {
    id: "hamstring-sweeps",
    name: "Hamstring Sweeps",
    shortCue: "Step one heel forward, hinge, and sweep the hands past the foot",
    instructions: [
      "Stand tall, then step your right heel forward onto the ground, toes up, front leg straight.",
      "Hinge at the hips over the straight front leg, keeping the back flat.",
      "Sweep both hands down past the front foot and along the floor, feeling the back of the front thigh stretch.",
      "Stand back up as the arms sweep overhead, step together, and repeat on the left leg.",
      "Alternate sides in a walking or on-the-spot rhythm.",
    ],
    tips: [
      "Push the hips back as you hinge — that's what loads the hamstring.",
      "Keep the front knee straight and the back long.",
    ],
    durationSeconds: 30,
    tags: ["hamstrings", "hips"],
  },
  {
    id: "inchworms",
    name: "Inchworms",
    shortCue: "Fold down, walk the hands out to a plank, and walk the feet back in",
    instructions: [
      "Stand tall, then fold forward and place your hands on the floor, bending the knees as much as needed.",
      "Walk the hands forward step by step until you reach a straight-arm plank.",
      "Pause for a beat with the body in one strong line.",
      "Keeping the legs as straight as comfortable, walk the feet toward the hands in small steps until you feel the hamstrings.",
      "Roll or stand up tall, and repeat the cycle in a continuous flow.",
    ],
    tips: [
      "Don't let the hips sag in the plank — brace before you walk the feet in.",
      "Straighter legs on the walk-in means more hamstring; bend them if the back rounds hard.",
    ],
    durationSeconds: 30,
    tags: ["hamstrings", "shoulders", "spine"],
  },

  // ---------- Ankles / knees ----------
  {
    id: "ankle-rocks",
    name: "Ankle Rocks",
    shortCue: "In a half-kneel, rock the front knee forward past the toes",
    instructions: [
      "Kneel on your left knee with your right foot flat on the floor in front of you (half-kneeling).",
      "Keeping the right heel glued down, rock your right knee forward over and past the toes.",
      "Rock back to the start and keep pulsing forward and back in a steady rhythm.",
      "Steer the knee slightly out, straight ahead, and slightly in on different reps to cover the whole ankle.",
      "Switch legs halfway through.",
    ],
    tips: [
      "The heel must stay down — if it lifts, shorten the rock.",
      "Drive the knee over the toes, not collapsing inward.",
    ],
    durationSeconds: 30,
    tags: ["ankles", "knees", "pistol-prep"],
  },

  // ---------- Squat ----------
  {
    id: "deep-squat-reaches",
    name: "Deep Squat Reaches",
    shortCue: "Sit in a deep squat and reach one arm at a time up toward the ceiling",
    instructions: [
      "Stand with feet slightly wider than shoulder-width, toes turned out a little.",
      "Sink into the deepest squat you can hold comfortably, heels down, using your elbows to nudge the knees out.",
      "Reach your right arm up toward the ceiling, rotating the chest open and following the hand with your eyes.",
      "Bring it down and reach the left arm up the same way.",
      "Keep alternating reaches while staying settled in the bottom of the squat.",
    ],
    tips: [
      "Heels stay planted — widen the stance if they lift.",
      "Stay tall in the squat; reach up, don't just wave the arm.",
    ],
    durationSeconds: 30,
    tags: ["squat", "ankles", "rotation", "pistol-prep"],
  },
  {
    id: "squat-pry",
    name: "Squat Pry",
    shortCue: "Sit in the bottom of a squat and shift weight side to side to pry the hips open",
    instructions: [
      "Squat all the way down with feet slightly wider than shoulder-width, heels down.",
      "Press your elbows against the insides of your knees, palms together, and sit tall.",
      "Shift your weight over to one side, driving that knee out with the elbow and letting the opposite ankle and hip open up.",
      "Shift across to the other side the same way.",
      "Keep rocking and prying side to side, wiggling into new corners of the squat each pass.",
    ],
    tips: [
      "Keep both heels down the entire time — that's the whole point.",
      "Use the elbows actively to pry the knees out; stay tall, don't slump.",
    ],
    durationSeconds: 30,
    tags: ["squat", "hips", "ankles", "pistol-prep"],
  },
  {
    id: "cossack-squats",
    name: "Cossack Squats",
    shortCue: "In a wide stance, sit deep over one leg while the other stays straight",
    instructions: [
      "Take a very wide stance, toes pointing mostly forward.",
      "Shift your weight over your right leg and sit down toward the right heel, bending that knee deeply.",
      "Let the left leg stay straight with the toes pulling up toward the ceiling.",
      "Push back up through the right leg to the middle, then flow across and sit over the left side.",
      "Keep alternating side to side smoothly, using arms in front as a counterbalance.",
    ],
    tips: [
      "Keep the heel of the bent leg down — reduce depth before letting it lift.",
      "Chest up; counterbalance with the arms instead of folding forward.",
    ],
    durationSeconds: 30,
    tags: ["squat", "hips", "pistol-prep"],
  },
  {
    id: "squat-to-hamstring-fold",
    name: "Squat to Hamstring Fold",
    shortCue: "Alternate between a deep squat and a straight-leg fold, hands on toes",
    instructions: [
      "Stand with feet shoulder-width apart, fold down and grab your toes (bend the knees as much as needed).",
      "Keeping hold of the toes, pull yourself down into a deep squat, chest up and heels down.",
      "Then, still holding the toes, straighten the legs as much as comfortable, sending the hips up into a hamstring fold.",
      "Sink back down into the squat, and keep flowing between the two positions rhythmically.",
    ],
    tips: [
      "Keep hold of the toes the whole time — it keeps the movement honest.",
      "Straighten the legs only as far as the hamstrings allow; depth of stretch grows over the reps.",
    ],
    durationSeconds: 30,
    tags: ["squat", "hamstrings", "hips"],
  },
  {
    id: "dynamic-squat-rotations",
    name: "Dynamic Squat Rotations",
    shortCue: "Flow between a deep squat and a standing twist, arms sweeping around",
    instructions: [
      "Stand with feet slightly wider than shoulder-width, arms relaxed.",
      "Drop into a deep squat, sweeping the arms down and across the body.",
      "Drive back up to standing while rotating your torso to one side, arms sweeping up and around with the turn.",
      "Drop into the next squat through the middle, then rise and rotate to the other side.",
      "Keep the flow continuous — squat, rise-and-twist, squat, rise-and-twist.",
    ],
    tips: [
      "Let the back heel pivot on the twist so the knees stay happy.",
      "Sink honestly into each squat — don't let the rotation shrink the depth.",
    ],
    durationSeconds: 30,
    tags: ["squat", "rotation", "spine", "hips"],
  },

  // ---------- Lunge ----------
  {
    id: "worlds-greatest-stretch",
    name: "World's Greatest Stretch",
    shortCue: "Deep lunge with a hand on the floor, rotating one arm up to the sky, alternating sides",
    instructions: [
      "From standing, step your right foot forward into a long, deep lunge and place both hands on the floor inside the front foot.",
      "Let the hips sink toward the floor, back leg long behind you.",
      "Drop your right elbow toward the instep of the front foot, then place that hand back down.",
      "Rotate your chest open and reach the right arm up toward the ceiling, following the hand with your eyes.",
      "Bring the hand down, step back to standing, and repeat on the left side.",
      "Keep alternating sides in one continuous flow.",
    ],
    tips: [
      "Keep the back leg long and active so the hip flexor actually stretches.",
      "Rotate from the upper back — the arm just follows.",
    ],
    durationSeconds: 45,
    tags: ["lunge", "rotation", "hips", "hamstrings"],
  },
  {
    id: "low-lunge-rotations",
    name: "Low Lunge Rotations",
    shortCue: "In a low lunge, rotate the torso and reach toward the front-leg side",
    instructions: [
      "Step your right foot forward into a low lunge, back knee hovering or resting on the floor, left hand planted under the shoulder.",
      "Rotate your chest toward the front leg and reach the right arm up to the ceiling.",
      "Bring the arm back down and thread it gently under your body to the left, letting the upper back round and rotate the other way.",
      "Keep rotating open and closed in a smooth rhythm.",
      "Switch legs halfway through.",
    ],
    tips: [
      "Sink the hips forward and down while you rotate — don't let the lunge get shallow.",
      "Rotate through the ribs, not by throwing the arm.",
    ],
    durationSeconds: 30,
    tags: ["lunge", "hips", "rotation", "spine"],
  },
  {
    id: "lateral-lunge-shifts",
    name: "Lateral Lunge Shifts",
    shortCue: "In a wide stance, shift the hips side to side between shallow side lunges",
    instructions: [
      "Take a wide stance with toes pointing forward, hands together in front of your chest.",
      "Shift your hips over to the right, bending the right knee into a side lunge while the left leg stays straight.",
      "Push off and glide across to the left side the same way, without standing all the way up in between.",
      "Keep shifting side to side in a smooth, continuous rhythm, sinking a little deeper as you warm up.",
    ],
    tips: [
      "Sit the hips back as you shift — knee tracks over the toes, not past them collapsing in.",
      "Keep both feet flat and pointing forward.",
    ],
    durationSeconds: 30,
    tags: ["lunge", "hips", "squat"],
  },

  // ---------- Floor flows ----------
  {
    id: "down-dog-up-dog",
    name: "Down Dog to Up Dog",
    shortCue: "Flow between an upside-down V and a chest-up upward dog",
    instructions: [
      "Start on hands and feet with hips pushed high — body forming an upside-down V (down dog): arms straight, head between the arms, heels reaching toward the floor.",
      "Shift forward, lowering the hips toward the floor while rolling over the toes.",
      "Pull the chest through and up between straight arms, hips low, legs long behind you, gaze forward (up dog).",
      "Push the floor away and send the hips back up and over into down dog.",
      "Keep flowing between the two shapes with slow, full breaths — one breath per shape.",
    ],
    tips: [
      "In down dog, push the floor away and reach the hips up; bend the knees if the hamstrings are screaming.",
      "In up dog, keep the shoulders pulled down away from the ears and the glutes lightly engaged.",
    ],
    durationSeconds: 40,
    tags: ["spine", "shoulders", "hamstrings", "floor-flow"],
  },
  {
    id: "bear-to-down-dog",
    name: "Bear to Down Dog",
    shortCue: "Flow between a knees-hovering bear crawl position and down dog",
    instructions: [
      "Start on all fours, then tuck the toes and lift the knees an inch off the floor — the 'bear' position, back flat.",
      "Push through the hands and straighten the legs, sending the hips up and back into an upside-down V (down dog).",
      "Press the chest gently toward the thighs and reach the heels toward the floor for a beat.",
      "Bend the knees and return to the bear hover with control.",
      "Keep flowing between the two positions in a steady rhythm.",
    ],
    tips: [
      "Keep the knees hovering low in bear — an inch off the floor, not a foot.",
      "Push the floor away hard in both positions; don't hang in the shoulders.",
    ],
    durationSeconds: 30,
    tags: ["floor-flow", "shoulders", "hamstrings", "wrists"],
  },
  {
    id: "ape-squat-transitions",
    name: "Ape Squat Transitions",
    shortCue: "From a deep squat, plant the hands to one side and hop the feet across",
    instructions: [
      "Sit into a deep squat with feet about shoulder-width, arms hanging inside the knees.",
      "Reach both hands to the floor on your right side, planting them firmly at roughly shoulder height apart.",
      "Lean weight into the hands and lightly hop both feet across to the right, landing back in a deep squat.",
      "Reach the hands to the left and hop the feet across the other way.",
      "Keep traveling side to side in a relaxed rhythm, staying low in the squat throughout.",
    ],
    tips: [
      "Commit weight to the hands before the feet leave the floor.",
      "Land softly and settle back into the full squat each time — don't stand up between reps.",
    ],
    durationSeconds: 30,
    tags: ["squat", "floor-flow", "hips", "wrists"],
  },
  {
    id: "lizard-to-hamstring-flow",
    name: "Lizard to Hamstring Flow",
    shortCue: "Flow between a deep lizard lunge and a straight-leg hamstring fold",
    instructions: [
      "Step your right foot forward and outside your right hand, sinking into a deep lunge with both hands on the floor inside the foot — the 'lizard' position.",
      "Let the hips sag toward the floor for a beat, back leg long behind you.",
      "Then rock back, straightening the front leg and pulling the toes up, folding the chest over it into a hamstring stretch.",
      "Melt forward again into the deep lizard lunge.",
      "Keep flowing between the two positions, then switch legs halfway through.",
    ],
    tips: [
      "Keep the hands (or fingertips) on the floor throughout to link the positions smoothly.",
      "In the fold, push the hips back rather than just leaning the chest down.",
    ],
    durationSeconds: 30,
    tags: ["floor-flow", "hips", "hamstrings", "lunge"],
  },
];

export const WARMUP_MOVEMENTS_BY_ID: Record<string, WarmupMovement> = Object.fromEntries(
  WARMUP_MOVEMENTS.map((m) => [m.id, m]),
);
