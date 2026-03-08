-- supabase/tests/seed_admins_and_patients.test.sql
-- pgTAP tests for dev_seed.sql
-- Run with: supabase test db

-- Admins:   "user" row + public.admin junction row
-- Patients: "user" row + public.patient junction row


BEGIN;

SELECT plan(29);


-- SECTION 1: Admin "user" rows — presence and correct data
SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'admin@floorahep.dev'),
  'admin@floorahep.dev exists in "user"'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'sarah@floorahep.dev'),
  'sarah@floorahep.dev exists in "user"'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'marcus@floorahep.dev'),
  'marcus@floorahep.dev exists in "user"'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'priya@floorahep.dev'),
  'priya@floorahep.dev exists in "user"'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'jordan@floorahep.dev'),
  'jordan@floorahep.dev exists in "user"'
);


-- SECTION 2: public.admin junction rows — every admin user has one
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN public."user" u ON u.user_id = a.user_id
    WHERE u.email = 'admin@floorahep.dev'
  ),
  'admin@floorahep.dev has a row in public.admin'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN public."user" u ON u.user_id = a.user_id
    WHERE u.email = 'sarah@floorahep.dev'
  ),
  'sarah@floorahep.dev has a row in public.admin'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN public."user" u ON u.user_id = a.user_id
    WHERE u.email = 'marcus@floorahep.dev'
  ),
  'marcus@floorahep.dev has a row in public.admin'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN public."user" u ON u.user_id = a.user_id
    WHERE u.email = 'priya@floorahep.dev'
  ),
  'priya@floorahep.dev has a row in public.admin'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.admin a
    JOIN public."user" u ON u.user_id = a.user_id
    WHERE u.email = 'jordan@floorahep.dev'
  ),
  'jordan@floorahep.dev has a row in public.admin'
);


-- Admin count matches
SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.admin a
   JOIN public."user" u ON u.user_id = a.user_id
   WHERE u.email LIKE '%@floorahep.dev'),
  5,
  'exactly 5 seeded admin rows exist in public.admin'
);

-- No patient is accidentally also an admin
SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.admin a
   JOIN public."user" u ON u.user_id = a.user_id
   WHERE u.email LIKE '%@example.com'),
  0,
  'no @example.com patient user has a row in public.admin'
);


-- SECTION 3: Patient "user" rows — presence and correct data
SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'alex@example.com'),
  'alex@example.com exists in "user"'
);

SELECT is(
  (SELECT fname || ' ' || lname FROM public."user" WHERE email = 'alex@example.com'),
  'Alex Patient',
  'alex@example.com has correct full name'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'bailey@example.com'),
  'bailey@example.com exists in "user"'
);

SELECT is(
  (SELECT fname || ' ' || lname FROM public."user" WHERE email = 'bailey@example.com'),
  'Bailey Patient',
  'bailey@example.com has correct full name'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'carlos@example.com'),
  'carlos@example.com exists in "user"'
);

SELECT is(
  (SELECT fname || ' ' || lname FROM public."user" WHERE email = 'carlos@example.com'),
  'Carlos Rivera',
  'carlos@example.com has correct full name'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'diana@example.com'),
  'diana@example.com exists in "user"'
);

SELECT is(
  (SELECT fname || ' ' || lname FROM public."user" WHERE email = 'diana@example.com'),
  'Diana Nguyen',
  'diana@example.com has correct full name'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public."user" WHERE email = 'ethan@example.com'),
  'ethan@example.com exists in "user"'
);

SELECT is(
  (SELECT fname || ' ' || lname FROM public."user" WHERE email = 'ethan@example.com'),
  'Ethan Brooks',
  'ethan@example.com has correct full name'
);


-- SECTION 4: public.patient junction rows — every patient user has one
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.patient pa
    JOIN public."user" u ON u.user_id = pa.user_id
    WHERE u.email = 'alex@example.com'
  ),
  'alex@example.com has a row in public.patient'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.patient pa
    JOIN public."user" u ON u.user_id = pa.user_id
    WHERE u.email = 'bailey@example.com'
  ),
  'bailey@example.com has a row in public.patient'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.patient pa
    JOIN public."user" u ON u.user_id = pa.user_id
    WHERE u.email = 'carlos@example.com'
  ),
  'carlos@example.com has a row in public.patient'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.patient pa
    JOIN public."user" u ON u.user_id = pa.user_id
    WHERE u.email = 'diana@example.com'
  ),
  'diana@example.com has a row in public.patient'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.patient pa
    JOIN public."user" u ON u.user_id = pa.user_id
    WHERE u.email = 'ethan@example.com'
  ),
  'ethan@example.com has a row in public.patient'
);


-- Patient count matches (no missing or extra rows)
SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.patient pa
   JOIN public."user" u ON u.user_id = pa.user_id
   WHERE u.email IN (
     'alex@example.com', 'bailey@example.com', 'carlos@example.com',
     'diana@example.com', 'ethan@example.com'
   )),
  5,
  'exactly 5 seeded patient rows exist in public.patient'
);

-- No admin is accidentally also a patient
SELECT is(
  (SELECT COUNT(*)::INT
   FROM public.patient pa
   JOIN public."user" u ON u.user_id = pa.user_id
   WHERE u.email LIKE '%@floorahep.dev'),
  0,
  'no @floorahep.dev admin user has a row in public.patient'
);

SELECT * FROM finish();

ROLLBACK;