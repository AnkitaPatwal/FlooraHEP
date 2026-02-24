-- ATH-221: Verify Data Relationships and Admin Access
-- Seed: creates a plan, creates a module, links them via plan_module,
--       links exercise_id=19 to the module via module_exercise,
--       and ensures an admin exists for created_by_admin_id.
--
-- Notes:
-- - plan.plan_id is IDENTITY GENERATED ALWAYS -> do not insert plan_id explicitly.
-- - plan.created_by_admin_id is BIGINT FK to public.admin (admin.user_id).
-- - admin.auth_user_id is nullable, so we only insert user_id.

BEGIN;

-- ── 0. Ensure a base user exists (BIGINT user_id) ─────────────────────────────
INSERT INTO public."user" (email, password, fname, lname)
SELECT
  'kayla.garibay31@gmail.com',
  'demo',        -- dev-only placeholder
  'Kayla',
  'Garibay'
WHERE NOT EXISTS (
  SELECT 1 FROM public."user" WHERE email = 'kayla.garibay31@gmail.com'
);

-- ── 0b. Ensure an admin row exists in public.admin (BIGINT user_id) ───────────
INSERT INTO public.admin (user_id)
SELECT u.user_id
FROM public."user" u
WHERE u.email = 'kayla.garibay31@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id
  );

-- ── 1. Plan ───────────────────────────────────────────────────────────────────
INSERT INTO public.plan (title, description, created_by_admin_id)
SELECT
  'Pelvic Floor Rehab',
  'Beginner pelvic floor rehabilitation programme',
  a.user_id
FROM public.admin a
JOIN public."user" u
  ON u.user_id = a.user_id
WHERE u.email = 'kayla.garibay31@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.plan WHERE title = 'Pelvic Floor Rehab'
  );

-- ── 2. Module ─────────────────────────────────────────────────────────────────
INSERT INTO public.module (title, description, session_number, created_by_admin_id)
SELECT
  'Foundation Exercises',
  'Core activation and pelvic tilt basics',
  1,
  a.user_id
FROM public.admin a
JOIN public."user" u
  ON u.user_id = a.user_id
WHERE u.email = 'kayla.garibay31@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.module WHERE title = 'Foundation Exercises'
  );
-- ── 3. Link plan → module via plan_module ─────────────────────────────────────
INSERT INTO public.plan_module (plan_id, module_id, order_index)
SELECT
  p.plan_id,
  m.module_id,
  1
FROM public.plan p
JOIN public.module m
  ON m.title = 'Foundation Exercises'
WHERE p.title = 'Pelvic Floor Rehab'
  AND NOT EXISTS (
    SELECT 1
    FROM public.plan_module pm
    WHERE pm.plan_id = p.plan_id
      AND pm.module_id = m.module_id
  );

-- ── 4. Link module → exercise via module_exercise ─────────────────────────────
INSERT INTO public.module_exercise (module_id, exercise_id)
SELECT
  m.module_id,
  19
FROM public.module m
WHERE m.title = 'Foundation Exercises'
  AND EXISTS (SELECT 1 FROM public.exercise e WHERE e.exercise_id = 19)
  AND NOT EXISTS (
    SELECT 1
    FROM public.module_exercise me
    WHERE me.module_id = m.module_id
      AND me.exercise_id = 19
  );

-- ── 5. OPTIONAL: ensure admin_users row exists (separate from public.admin) ───
INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT
  'kayla.garibay31@gmail.com',
  '$2a$10$4A7Y/Ot6nUZjfg6oPIQ3PuITV00iQWtPQGU/QwXdjKMK40LxSn8A6',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE email = 'kayla.garibay31@gmail.com'
);

COMMIT;