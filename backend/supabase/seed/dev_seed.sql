-- dev_seed.sql — idempotent, matches current columns
-- users: (user_id auto?), email, password, fname, lname
-- patients: user_id (FK)

-- Users
-- ATH-243: 3 extra seed user patients
INSERT INTO public."user"(email, password, fname, lname)
SELECT 'alex@example.com', 'dev_password_123', 'Alex', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email='alex@example.com');

INSERT INTO public."user"(email, password, fname, lname)
SELECT 'bailey@example.com', 'dev_password_123', 'Bailey', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email='bailey@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'carlos@example.com', 'dev_password_123', 'Carlos', 'Rivera'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'carlos@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'diana@example.com', 'dev_password_123', 'Diana', 'Nguyen'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'diana@example.com');

INSERT INTO public."user" (email, password, fname, lname)
SELECT 'ethan@example.com', 'dev_password_123', 'Ethan', 'Brooks'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email = 'ethan@example.com');



-- Patients. Only insert if not already present.
-- ATH-243: 3 extra seed user patients
INSERT INTO public.patient(user_id)
SELECT u.user_id
FROM public."user" u
WHERE u.email='alex@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient p
    WHERE p.user_id = u.user_id
  );

INSERT INTO public.patient(user_id)
SELECT u.user_id
FROM public."user" u
WHERE u.email='bailey@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient p
    WHERE p.user_id = u.user_id
  );

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'carlos@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient p
    WHERE p.user_id = u.user_id
  );

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'diana@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient p
    WHERE p.user_id = u.user_id
  );

INSERT INTO public.patient (user_id)
SELECT u.user_id FROM public."user" u
WHERE u.email = 'ethan@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient p
    WHERE p.user_id = u.user_id
  );



-- ATH-375: Exercise video references
-- Videos metadata (files stored in Supabase Storage bucket: exercise-videos)
INSERT INTO public.video (bucket, object_key, original_filename, mime_type, byte_size, duration_seconds, width, height, uploader_user_id) 
SELECT 'exercise-videos', 'crunches.mp4', 'crunches.mp4', 'video/mp4', 1024000, 30, 1920, 1080, 
  (SELECT user_id FROM public."user" WHERE email='admin@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.video WHERE object_key='crunches.mp4');

INSERT INTO public.video (bucket, object_key, original_filename, mime_type, byte_size, duration_seconds, width, height, uploader_user_id) 
SELECT 'exercise-videos', 'plank.mp4', 'plank.mp4', 'video/mp4', 2048000, 45, 1920, 1080,
  (SELECT user_id FROM public."user" WHERE email='admin@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.video WHERE object_key='plank.mp4');



-- ATH-243: 5 seed admins
-- Passwords are plaintext here; your bcrypt trigger hashes them on INSERT.
INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT 'admin@floorahep.dev', 'Admin1Dev!', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'admin@floorahep.dev');

INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT 'sarah@floorahep.dev', 'Admin2Dev!', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'sarah@floorahep.dev');

INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT 'marcus@floorahep.dev', 'Admin3Dev!', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'marcus@floorahep.dev');

INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT 'priya@floorahep.dev', 'Admin4Dev!', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'priya@floorahep.dev');

INSERT INTO public.admin_users (email, password_hash, is_active)
SELECT 'jordan@floorahep.dev', 'Admin5Dev!', true
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = 'jordan@floorahep.dev');