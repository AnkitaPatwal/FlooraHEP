-- supabase/tests/seed_plans_modules_exercises.test.sql
-- pgTAP tests for plans_seed.sql
-- Run with: supabase test db

-- Exercises:       public.exercise rows
-- Modules:         public.module rows
-- Module→Exercise: public.module_exercise junction rows
-- Plans:           public.plan rows
-- Plan→Module:     public.plan_module junction rows
-- User→Module:     public.user_module assignment rows


BEGIN;

SELECT plan(64);


-- SECTION 1: Exercises — presence and correct data
SELECT ok(
  EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Crunches'),
  'exercise "Crunches" exists'
);

SELECT is(
  (SELECT default_sets FROM public.exercise WHERE title = 'Crunches'),
  3,
  'Crunches has default_sets = 3'
);

SELECT is(
  (SELECT default_reps FROM public.exercise WHERE title = 'Crunches'),
  15,
  'Crunches has default_reps = 15'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.exercise e
    JOIN public.video v ON v.video_id = e.video_id
    WHERE e.title = 'Crunches' AND v.object_key = 'crunches.mp4'
  ),
  'Crunches is linked to crunches.mp4'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Plank'),
  'exercise "Plank" exists'
);

SELECT is(
  (SELECT default_sets FROM public.exercise WHERE title = 'Plank'),
  3,
  'Plank has default_sets = 3'
);

SELECT is(
  (SELECT default_reps FROM public.exercise WHERE title = 'Plank'),
  NULL,
  'Plank has default_reps = NULL (timed hold)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.exercise e
    JOIN public.video v ON v.video_id = e.video_id
    WHERE e.title = 'Plank' AND v.object_key = 'plank.mp4'
  ),
  'Plank is linked to plank.mp4'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Pelvic Tilts'),
  'exercise "Pelvic Tilts" exists'
);

SELECT is(
  (SELECT default_sets FROM public.exercise WHERE title = 'Pelvic Tilts'),
  3,
  'Pelvic Tilts has default_sets = 3'
);

SELECT is(
  (SELECT default_reps FROM public.exercise WHERE title = 'Pelvic Tilts'),
  10,
  'Pelvic Tilts has default_reps = 10'
);

SELECT is(
  (SELECT video_id FROM public.exercise WHERE title = 'Pelvic Tilts'),
  NULL,
  'Pelvic Tilts has no video (video_id = NULL)'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Glute Bridge'),
  'exercise "Glute Bridge" exists'
);

SELECT is(
  (SELECT default_sets FROM public.exercise WHERE title = 'Glute Bridge'),
  3,
  'Glute Bridge has default_sets = 3'
);

SELECT is(
  (SELECT default_reps FROM public.exercise WHERE title = 'Glute Bridge'),
  12,
  'Glute Bridge has default_reps = 12'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.exercise WHERE title = 'Cat-Cow Stretch'),
  'exercise "Cat-Cow Stretch" exists'
);

SELECT is(
  (SELECT default_sets FROM public.exercise WHERE title = 'Cat-Cow Stretch'),
  2,
  'Cat-Cow Stretch has default_sets = 2'
);

SELECT is(
  (SELECT default_reps FROM public.exercise WHERE title = 'Cat-Cow Stretch'),
  10,
  'Cat-Cow Stretch has default_reps = 10'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.exercise e
   JOIN public."user" u ON u.user_id = e.created_by_admin_id
   WHERE e.title IN ('Crunches', 'Plank', 'Pelvic Tilts', 'Glute Bridge', 'Cat-Cow Stretch')
     AND u.email = 'admin@floorahep.dev'),
  5,
  'all 5 seeded exercises are attributed to admin@floorahep.dev'
);


-- SECTION 2: Modules — presence and correct session numbers
SELECT ok(
  EXISTS (SELECT 1 FROM public.module WHERE title = 'Core Foundations' AND session_number = 1),
  'module "Core Foundations" (session 1) exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.module WHERE title = 'Pelvic Stability' AND session_number = 2),
  'module "Pelvic Stability" (session 2) exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.module WHERE title = 'Strength Progression' AND session_number = 3),
  'module "Strength Progression" (session 3) exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.module WHERE title = 'Flexibility and Mobility' AND session_number = 4),
  'module "Flexibility and Mobility" (session 4) exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.module WHERE title = 'Active Recovery' AND session_number = 5),
  'module "Active Recovery" (session 5) exists'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.module m
   JOIN public."user" u ON u.user_id = m.created_by_admin_id
   WHERE m.title IN ('Core Foundations', 'Pelvic Stability', 'Strength Progression', 'Flexibility and Mobility', 'Active Recovery')
     AND u.email = 'admin@floorahep.dev'),
  5,
  'all 5 seeded modules are attributed to admin@floorahep.dev'
);


-- SECTION 3: module_exercise — correct linkage and ordering
SELECT is(
  (SELECT me.order_index FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Core Foundations' AND m.session_number = 1 AND e.title = 'Pelvic Tilts'),
  1,
  'Core Foundations: Pelvic Tilts is at order_index 1'
);

SELECT is(
  (SELECT me.order_index FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Core Foundations' AND m.session_number = 1 AND e.title = 'Crunches'),
  2,
  'Core Foundations: Crunches is at order_index 2'
);

SELECT is(
  (SELECT me.order_index FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Core Foundations' AND m.session_number = 1 AND e.title = 'Plank'),
  3,
  'Core Foundations: Plank is at order_index 3'
);

SELECT is(
  (SELECT me.sets_override FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Strength Progression' AND m.session_number = 3 AND e.title = 'Crunches'),
  4,
  'Strength Progression: Crunches sets_override = 4'
);

SELECT is(
  (SELECT me.reps_override FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Strength Progression' AND m.session_number = 3 AND e.title = 'Crunches'),
  20,
  'Strength Progression: Crunches reps_override = 20'
);

SELECT is(
  (SELECT me.sets_override FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Strength Progression' AND m.session_number = 3 AND e.title = 'Glute Bridge'),
  4,
  'Strength Progression: Glute Bridge sets_override = 4'
);

SELECT is(
  (SELECT me.reps_override FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Strength Progression' AND m.session_number = 3 AND e.title = 'Glute Bridge'),
  15,
  'Strength Progression: Glute Bridge reps_override = 15'
);

SELECT is(
  (SELECT me.sets_override FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   JOIN public.exercise e ON e.exercise_id = me.exercise_id
   WHERE m.title = 'Strength Progression' AND m.session_number = 3 AND e.title = 'Plank'),
  4,
  'Strength Progression: Plank sets_override = 4'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.module_exercise me
   JOIN public.module m ON m.module_id = me.module_id
   WHERE m.title IN ('Core Foundations', 'Pelvic Stability', 'Strength Progression', 'Flexibility and Mobility', 'Active Recovery')),
  14,
  'exactly 14 module_exercise rows exist across the 5 seeded modules'
);


-- SECTION 4: Plans — presence and correct data
SELECT ok(
  EXISTS (SELECT 1 FROM public.plan WHERE title = '4-Week Core Starter'),
  'plan "4-Week Core Starter" exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.plan WHERE title = '8-Week Pelvic Recovery'),
  'plan "8-Week Pelvic Recovery" exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.plan WHERE title = 'Postpartum Restoration'),
  'plan "Postpartum Restoration" exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.plan WHERE title = 'Strength and Conditioning'),
  'plan "Strength and Conditioning" exists'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.plan WHERE title = 'Maintenance and Mobility'),
  'plan "Maintenance and Mobility" exists'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.plan p
   JOIN public."user" u ON u.user_id = p.created_by_admin_id
   WHERE p.title IN ('4-Week Core Starter', '8-Week Pelvic Recovery', 'Postpartum Restoration', 'Strength and Conditioning', 'Maintenance and Mobility')
     AND u.email = 'admin@floorahep.dev'),
  5,
  'all 5 seeded plans are attributed to admin@floorahep.dev'
);


-- SECTION 5: plan_module — correct linkage and ordering
SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = '4-Week Core Starter' AND m.title = 'Core Foundations' AND m.session_number = 1),
  1,
  '4-Week Core Starter: Core Foundations is at order_index 1'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = '4-Week Core Starter' AND m.title = 'Pelvic Stability' AND m.session_number = 2),
  2,
  '4-Week Core Starter: Pelvic Stability is at order_index 2'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = '8-Week Pelvic Recovery' AND m.title = 'Core Foundations' AND m.session_number = 1),
  1,
  '8-Week Pelvic Recovery: Core Foundations is at order_index 1'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = '8-Week Pelvic Recovery' AND m.title = 'Strength Progression' AND m.session_number = 3),
  2,
  '8-Week Pelvic Recovery: Strength Progression is at order_index 2'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Postpartum Restoration' AND m.title = 'Core Foundations' AND m.session_number = 1),
  1,
  'Postpartum Restoration: Core Foundations is at order_index 1'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Postpartum Restoration' AND m.title = 'Active Recovery' AND m.session_number = 5),
  2,
  'Postpartum Restoration: Active Recovery is at order_index 2'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Strength and Conditioning' AND m.title = 'Pelvic Stability' AND m.session_number = 2),
  1,
  'Strength and Conditioning: Pelvic Stability is at order_index 1'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Strength and Conditioning' AND m.title = 'Strength Progression' AND m.session_number = 3),
  2,
  'Strength and Conditioning: Strength Progression is at order_index 2'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Maintenance and Mobility' AND m.title = 'Flexibility and Mobility' AND m.session_number = 4),
  1,
  'Maintenance and Mobility: Flexibility and Mobility is at order_index 1'
);

SELECT is(
  (SELECT pm.order_index FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   JOIN public.module m ON m.module_id = pm.module_id
   WHERE p.title = 'Maintenance and Mobility' AND m.title = 'Active Recovery' AND m.session_number = 5),
  2,
  'Maintenance and Mobility: Active Recovery is at order_index 2'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.plan_module pm
   JOIN public.plan p ON p.plan_id = pm.plan_id
   WHERE p.title IN ('4-Week Core Starter', '8-Week Pelvic Recovery', 'Postpartum Restoration', 'Strength and Conditioning', 'Maintenance and Mobility')),
  10,
  'exactly 10 plan_module rows exist across the 5 seeded plans'
);


-- SECTION 6: user_module — patient assignments
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'alex@example.com'
      AND m.title = 'Core Foundations' AND m.session_number = 1
  ),
  'alex@example.com is assigned to module "Core Foundations"'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'alex@example.com'
      AND m.title = 'Pelvic Stability' AND m.session_number = 2
  ),
  'alex@example.com is assigned to module "Pelvic Stability"'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.user_module um
   JOIN public."user" u ON u.user_id = um.user_id
   WHERE u.email = 'alex@example.com'),
  2,
  'alex@example.com has exactly 2 module assignments'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'bailey@example.com'
      AND m.title = 'Strength Progression' AND m.session_number = 3
  ),
  'bailey@example.com is assigned to module "Strength Progression"'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'carlos@example.com'
      AND m.title = 'Flexibility and Mobility' AND m.session_number = 4
  ),
  'carlos@example.com is assigned to module "Flexibility and Mobility"'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'diana@example.com'
      AND m.title = 'Active Recovery' AND m.session_number = 5
  ),
  'diana@example.com is assigned to module "Active Recovery"'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'ethan@example.com'
      AND m.title = 'Core Foundations' AND m.session_number = 1
  ),
  'ethan@example.com is assigned to module "Core Foundations"'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.user_module um
    JOIN public."user" u ON u.user_id = um.user_id
    JOIN public.module m ON m.module_id = um.module_id
    WHERE u.email = 'ethan@example.com'
      AND m.title = 'Active Recovery' AND m.session_number = 5
  ),
  'ethan@example.com is assigned to module "Active Recovery"'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.user_module um
   JOIN public."user" u ON u.user_id = um.user_id
   WHERE u.email = 'ethan@example.com'),
  2,
  'ethan@example.com has exactly 2 module assignments'
);

SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.user_module um
   JOIN public."user" u ON u.user_id = um.user_id
   WHERE u.email LIKE '%@floorahep.dev'),
  0,
  'no @floorahep.dev admin user has a row in public.user_module'
);


SELECT * FROM finish();

ROLLBACK;