-- dev_seed.sql — idempotent, matches current schema
-- Admins are "user" rows + a corresponding row in public.admin (junction table)
-- Patients are "user" rows + a corresponding row in public.patient (junction table)

-- ATH 243: Admin Users
-- Step 1: insert into "user", Step 2: insert into public.admin
INSERT INTO public."user" (email, password, fname, lname)
SELECT 'admin@floorahep.dev', 'Admin1Dev!', 'Admin', 'One'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'admin@floorahep.dev');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'sarah@floorahep.dev', 'Admin2Dev!', 'Sarah', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'sarah@floorahep.dev');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'marcus@floorahep.dev', 'Admin3Dev!', 'Marcus', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'marcus@floorahep.dev');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'priya@floorahep.dev', 'Admin4Dev!', 'Priya', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'priya@floorahep.dev');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'jordan@floorahep.dev', 'Admin5Dev!', 'Jordan', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'jordan@floorahep.dev');


-- ATH 243: Mark each as admin in the junction table
INSERT INTO public.admin (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'admin@floorahep.dev'
  AND NOT EXISTS (SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id);

INSERT INTO public.admin (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'sarah@floorahep.dev'
  AND NOT EXISTS (SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id);

INSERT INTO public.admin (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'marcus@floorahep.dev'
  AND NOT EXISTS (SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id);

INSERT INTO public.admin (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'priya@floorahep.dev'
  AND NOT EXISTS (SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id);

INSERT INTO public.admin (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'jordan@floorahep.dev'
  AND NOT EXISTS (SELECT 1 FROM public.admin a WHERE a.user_id = u.user_id);


-- ATH 243: Patient Users
INSERT INTO public."user" (email, password, fname, lname)
SELECT 'alex@example.com', 'dev_password_123', 'Alex', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'alex@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'bailey@example.com', 'dev_password_123', 'Bailey', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'bailey@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'carlos@example.com', 'dev_password_123', 'Carlos', 'Rivera'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'carlos@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'diana@example.com', 'dev_password_123', 'Diana', 'Nguyen'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'diana@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'ethan@example.com', 'dev_password_123', 'Ethan', 'Brooks'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'ethan@example.com');


-- ATH 243: Mark each as patient in the junction table
INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'alex@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.patient p WHERE p.user_id = u.user_id);

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'bailey@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.patient p WHERE p.user_id = u.user_id);

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'carlos@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.patient p WHERE p.user_id = u.user_id);

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'diana@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.patient p WHERE p.user_id = u.user_id);

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'ethan@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.patient p WHERE p.user_id = u.user_id);


-- ATH-375: Exercise video references
INSERT INTO public.video (bucket, object_key, original_filename, mime_type, byte_size, duration_seconds, width, height, uploader_user_id)
SELECT 'exercise-videos', 'crunches.mp4', 'crunches.mp4', 'video/mp4', 1024000, 30, 1920, 1080,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.video WHERE object_key = 'crunches.mp4');

INSERT INTO public.video (bucket, object_key, original_filename, mime_type, byte_size, duration_seconds, width, height, uploader_user_id)
SELECT 'exercise-videos', 'plank.mp4', 'plank.mp4', 'video/mp4', 2048000, 45, 1920, 1080,
  (SELECT user_id FROM public."user" WHERE email = 'admin@floorahep.dev' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.video WHERE object_key = 'plank.mp4');