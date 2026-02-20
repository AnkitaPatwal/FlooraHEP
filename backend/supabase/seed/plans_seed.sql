-- ATH-245: Plans, Modules, and Exercises
-- All INSERTs are idempotent and match the existing admin/video seed rows.

-- 3. SEED — exercises  (5 exercises, idempotent by title)
-- Linked to admin@floorahep.dev and the two videos already seeded.


-- Exercise 1: Crunches  (uses crunches.mp4)
INSERT INTO public.exercise (title, description, default_sets, default_reps, video_id, created_by_admin_id)
SELECT
  'Crunches',
  'Lie on your back with knees bent and feet flat. Place hands behind your head, engage your core, and curl your shoulders toward your knees. Lower slowly back down.',
  3, 15,
  (SELECT video_id FROM public.video WHERE object_key = 'crunches.mp4' LIMIT 1),
  (SELECT user_id  FROM public."user"  WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Crunches');

-- Exercise 2: Plank  (uses plank.mp4)
INSERT INTO public.exercise (title, description, default_sets, default_reps, video_id, created_by_admin_id)
SELECT
  'Plank',
  'Begin in a push-up position with forearms on the floor. Keep your body in a straight line from head to heels, bracing your core throughout the hold.',
  3, NULL,
  (SELECT video_id FROM public.video WHERE object_key = 'plank.mp4' LIMIT 1),
  (SELECT user_id  FROM public."user"  WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Plank');

-- Exercise 3: Pelvic Tilts  (no video yet)
INSERT INTO public.exercise (title, description, default_sets, default_reps, video_id, created_by_admin_id)
SELECT
  'Pelvic Tilts',
  'Lie on your back with knees bent. Flatten your lower back against the floor by tightening your abdominals, hold for 5 seconds, then release.',
  3, 10,
  NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Pelvic Tilts');

-- Exercise 4: Glute Bridge  (no video yet)
INSERT INTO public.exercise (title, description, default_sets, default_reps, video_id, created_by_admin_id)
SELECT
  'Glute Bridge',
  'Lie on your back with knees bent and feet hip-width apart. Press through your heels to lift your hips until your body forms a straight line from knees to shoulders. Hold briefly, then lower.',
  3, 12,
  NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Glute Bridge');

-- Exercise 5: Cat-Cow Stretch  (no video yet)
INSERT INTO public.exercise (title, description, default_sets, default_reps, video_id, created_by_admin_id)
SELECT
  'Cat-Cow Stretch',
  'Start on hands and knees. Inhale and drop your belly toward the floor (cow), then exhale and round your spine toward the ceiling (cat). Move slowly through each rep.',
  2, 10,
  NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Cat-Cow Stretch');



-- 4. SEED — modules  (5 modules, idempotent by title + session_number)
INSERT INTO public.module (title, description, session_number, available_date, created_by_admin_id)
SELECT
  'Core Foundations',
  'Introduction to core activation and basic stability exercises for pelvic floor recovery.',
  1, NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE title = 'Core Foundations' AND session_number = 1);

INSERT INTO public.module (title, description, session_number, available_date, created_by_admin_id)
SELECT
  'Pelvic Stability',
  'Building on core activation with controlled pelvic movements and glute engagement.',
  2, NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE title = 'Pelvic Stability' AND session_number = 2);

INSERT INTO public.module (title, description, session_number, available_date, created_by_admin_id)
SELECT
  'Strength Progression',
  'Progressive loading of core and hip muscles to build functional strength.',
  3, NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE title = 'Strength Progression' AND session_number = 3);

INSERT INTO public.module (title, description, session_number, available_date, created_by_admin_id)
SELECT
  'Flexibility and Mobility',
  'Improving range of motion and reducing tension in the lumbar and pelvic regions.',
  4, NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE title = 'Flexibility and Mobility' AND session_number = 4);

INSERT INTO public.module (title, description, session_number, available_date, created_by_admin_id)
SELECT
  'Active Recovery',
  'Low-intensity movement and gentle stretching to support recovery between harder sessions.',
  5, NULL,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE title = 'Active Recovery' AND session_number = 5);



-- 5. SEED — module_exercise  (link exercises into modules, ordered)
-- Each module gets multiple exercises; order_index must be > 0.

-- Module 1 "Core Foundations" → Pelvic Tilts (1), Crunches (2), Plank (3)
INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 1
FROM public.module   m, public.exercise e
WHERE m.title = 'Core Foundations'  AND m.session_number = 1
  AND e.title = 'Pelvic Tilts'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 2
FROM public.module   m, public.exercise e
WHERE m.title = 'Core Foundations'  AND m.session_number = 1
  AND e.title = 'Crunches'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 3
FROM public.module   m, public.exercise e
WHERE m.title = 'Core Foundations'  AND m.session_number = 1
  AND e.title = 'Plank'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

-- Module 2 "Pelvic Stability" → Glute Bridge (1), Pelvic Tilts (2), Cat-Cow Stretch (3)
INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 1
FROM public.module   m, public.exercise e
WHERE m.title = 'Pelvic Stability'  AND m.session_number = 2
  AND e.title = 'Glute Bridge'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 2
FROM public.module   m, public.exercise e
WHERE m.title = 'Pelvic Stability'  AND m.session_number = 2
  AND e.title = 'Pelvic Tilts'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 3
FROM public.module   m, public.exercise e
WHERE m.title = 'Pelvic Stability'  AND m.session_number = 2
  AND e.title = 'Cat-Cow Stretch'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

-- Module 3 "Strength Progression" → Crunches (1), Glute Bridge (2), Plank (3)
INSERT INTO public.module_exercise (module_id, exercise_id, order_index, sets_override, reps_override)
SELECT m.module_id, e.exercise_id, 1, 4, 20
FROM public.module   m, public.exercise e
WHERE m.title = 'Strength Progression' AND m.session_number = 3
  AND e.title = 'Crunches'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index, sets_override, reps_override)
SELECT m.module_id, e.exercise_id, 2, 4, 15
FROM public.module   m, public.exercise e
WHERE m.title = 'Strength Progression' AND m.session_number = 3
  AND e.title = 'Glute Bridge'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index, sets_override)
SELECT m.module_id, e.exercise_id, 3, 4
FROM public.module   m, public.exercise e
WHERE m.title = 'Strength Progression' AND m.session_number = 3
  AND e.title = 'Plank'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

-- Module 4 "Flexibility and Mobility" → Cat-Cow Stretch (1), Pelvic Tilts (2)
INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 1
FROM public.module   m, public.exercise e
WHERE m.title = 'Flexibility and Mobility' AND m.session_number = 4
  AND e.title = 'Cat-Cow Stretch'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 2
FROM public.module   m, public.exercise e
WHERE m.title = 'Flexibility and Mobility' AND m.session_number = 4
  AND e.title = 'Pelvic Tilts'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

-- Module 5 "Active Recovery" → Cat-Cow Stretch (1), Glute Bridge (2), Pelvic Tilts (3)
INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 1
FROM public.module   m, public.exercise e
WHERE m.title = 'Active Recovery' AND m.session_number = 5
  AND e.title = 'Cat-Cow Stretch'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 2
FROM public.module   m, public.exercise e
WHERE m.title = 'Active Recovery' AND m.session_number = 5
  AND e.title = 'Glute Bridge'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );

INSERT INTO public.module_exercise (module_id, exercise_id, order_index)
SELECT m.module_id, e.exercise_id, 3
FROM public.module   m, public.exercise e
WHERE m.title = 'Active Recovery' AND m.session_number = 5
  AND e.title = 'Pelvic Tilts'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_exercise x
    WHERE x.module_id = m.module_id AND x.exercise_id = e.exercise_id
  );



-- 6. SEED — plans  (5 plans, idempotent by title)
INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  '4-Week Core Starter',
  'An introductory program for patients beginning pelvic floor rehabilitation. Focuses on foundational core activation and basic stability.',
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE title = '4-Week Core Starter');

INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  '8-Week Pelvic Recovery',
  'A comprehensive pelvic floor recovery program progressing from foundational movements through strength and mobility work.',
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE title = '8-Week Pelvic Recovery');

INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  'Postpartum Restoration',
  'Gentle reintroduction of movement for postpartum patients, prioritising pelvic stability and low-impact core engagement.',
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE title = 'Postpartum Restoration');

INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  'Strength and Conditioning',
  'For patients further along in recovery, this plan builds functional strength through progressive core and hip loading.',
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE title = 'Strength and Conditioning');

INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  'Maintenance and Mobility',
  'A low-intensity ongoing plan for patients in the maintenance phase, combining flexibility work with light active recovery sessions.',
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE title = 'Maintenance and Mobility');



-- 7. SEED — plan_module  (link modules into plans, ordered)

-- Plan "4-Week Core Starter" → Core Foundations (1), Pelvic Stability (2)
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 1
FROM public.plan p, public.module m
WHERE p.title = '4-Week Core Starter'
  AND m.title = 'Core Foundations' AND m.session_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 2
FROM public.plan p, public.module m
WHERE p.title = '4-Week Core Starter'
  AND m.title = 'Pelvic Stability' AND m.session_number = 2
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

-- Plan "8-Week Pelvic Recovery" → Core Foundations (1), Pelvic Stability (2)
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 1
FROM public.plan p, public.module m
WHERE p.title = '8-Week Pelvic Recovery'
  AND m.title = 'Core Foundations' AND m.session_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 2
FROM public.plan p, public.module m
WHERE p.title = '8-Week Pelvic Recovery'
  AND m.title = 'Strength Progression' AND m.session_number = 3
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

-- Plan "Postpartum Restoration" → Core Foundations (1), Active Recovery (2)
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 1
FROM public.plan p, public.module m
WHERE p.title = 'Postpartum Restoration'
  AND m.title = 'Core Foundations' AND m.session_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 2
FROM public.plan p, public.module m
WHERE p.title = 'Postpartum Restoration'
  AND m.title = 'Active Recovery' AND m.session_number = 5
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

-- Plan "Strength and Conditioning" → Pelvic Stability (1), Strength Progression (2)
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 1
FROM public.plan p, public.module m
WHERE p.title = 'Strength and Conditioning'
  AND m.title = 'Pelvic Stability' AND m.session_number = 2
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 2
FROM public.plan p, public.module m
WHERE p.title = 'Strength and Conditioning'
  AND m.title = 'Strength Progression' AND m.session_number = 3
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

-- Plan "Maintenance and Mobility" → Flexibility and Mobility (1), Active Recovery (2)
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 1
FROM public.plan p, public.module m
WHERE p.title = 'Maintenance and Mobility'
  AND m.title = 'Flexibility and Mobility' AND m.session_number = 4
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );

INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT p.plan_id, m.module_id, 2
FROM public.plan p, public.module m
WHERE p.title = 'Maintenance and Mobility'
  AND m.title = 'Active Recovery' AND m.session_number = 5
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_module x
    WHERE x.plan_id = p.plan_id AND x.module_id = m.module_id
  );



-- 8. SEED — user_module  (assign modules to patients)
--    This is how patients get access to content — admins created it,
--    but patients only see modules assigned to them via user_module.

-- Alex gets "Core Foundations" (available immediately)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now(),
  'Starting with foundational work — focus on form over speed.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'alex@example.com'
  AND m.title = 'Core Foundations' AND m.session_number = 1
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

-- Alex also gets "Pelvic Stability" (available in 1 week)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now() + interval '7 days',
  'Progress to this module after completing Core Foundations.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'alex@example.com'
  AND m.title = 'Pelvic Stability' AND m.session_number = 2
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

-- Bailey gets "Strength Progression" (available immediately)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now(),
  'You''re ready for progressive loading. Remember to breathe through each rep.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'bailey@example.com'
  AND m.title = 'Strength Progression' AND m.session_number = 3
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'sarah@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

-- Carlos gets "Flexibility and Mobility" (available immediately)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now(),
  'Focus on gentle movement and breathing.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'carlos@example.com'
  AND m.title = 'Flexibility and Mobility' AND m.session_number = 4
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'marcus@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

-- Diana gets "Active Recovery" (available immediately)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now(),
  'Perfect for your maintenance phase.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'diana@example.com'
  AND m.title = 'Active Recovery' AND m.session_number = 5
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'priya@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

-- Ethan gets both "Core Foundations" and "Active Recovery" (staggered availability)
INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now(),
  'Start here — we''ll layer in recovery work next week.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'ethan@example.com'
  AND m.title = 'Core Foundations' AND m.session_number = 1
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'jordan@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );

INSERT INTO public.user_module (user_id, module_id, assigned_by_admin_id, available_at, notes)
SELECT
  u.user_id,
  m.module_id,
  a.user_id,
  now() + interval '7 days',
  'Add this as an active rest day between harder sessions.'
FROM public."user" u, public.module m, public.admin a
WHERE u.email = 'ethan@example.com'
  AND m.title = 'Active Recovery' AND m.session_number = 5
  AND a.user_id = (SELECT user_id FROM public."user" WHERE email = 'jordan@floorahep.dev' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_module x
    WHERE x.user_id = u.user_id AND x.module_id = m.module_id
  );