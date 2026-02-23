-- ATH-221: Verify Data Relationships and Admin Access
-- Seed: creates a plan, links it to module_id=1 via plan_module junction,
--       and links exercise_id=19 to module_id=1 via module_exercise junction.
--
-- Junction-table hierarchy (from schema):
--   plan ↔ plan_module ↔ module ↔ module_exercise ↔ exercise
--
-- Prerequisites:
--   • All tables exist                        (20251102211852_main_schema.sql)
--   • exercise_id = 19 (pelvic tilt) exists   (main schema seed)
--   • video linked to exercise_id = 19        (20260222000001_ath246_seed_exercise_video.sql)
--   • admin user_id = 19 exists in admin_users
--
-- All inserts are idempotent (WHERE NOT EXISTS).

BEGIN;

-- ── 1. Plan ───────────────────────────────────────────────────────────────────
INSERT INTO public.plan (plan_id, title, description)
SELECT 1, 'Pelvic Floor Rehab', 'Beginner pelvic floor rehabilitation programme'
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE plan_id = 1);

-- ── 2. Module ─────────────────────────────────────────────────────────────────
INSERT INTO public.module (module_id, title, description)
SELECT 1, 'Foundation Exercises', 'Core activation and pelvic tilt basics'
WHERE NOT EXISTS (SELECT 1 FROM public.module WHERE module_id = 1);

-- ── 3. Link plan → module via plan_module junction ────────────────────────────
INSERT INTO public.plan_module (plan_id, module_id)
SELECT 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_module WHERE plan_id = 1 AND module_id = 1
);

-- ── 4. Link module → exercise via module_exercise junction ────────────────────
INSERT INTO public.module_exercise (module_id, exercise_id)
SELECT 1, 19
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_exercise WHERE module_id = 1 AND exercise_id = 19
);

-- ── 5. Ensure admin user_id = 19 is in admin_users ───────────────────────────
INSERT INTO public.admin_users (user_id)
SELECT 19
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = 19);

COMMIT;