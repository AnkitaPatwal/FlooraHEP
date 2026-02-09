-- dev_seed.sql — idempotent, matches current columns
-- users: (user_id auto?), email, password, fname, lname
-- patients: user_id (FK)

-- Users
INSERT INTO public."user"(email, password, fname, lname)
SELECT 'admin@example.com', 'dev_password_123', 'Admin', 'User'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email='admin@example.com');

INSERT INTO public."user"(email, password, fname, lname)
SELECT 'alex@example.com', 'dev_password_123', 'Alex', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email='alex@example.com');

INSERT INTO public."user"(email, password, fname, lname)
SELECT 'bailey@example.com', 'dev_password_123', 'Bailey', 'Patient'
WHERE NOT EXISTS (SELECT 1 FROM public."user" WHERE email='bailey@example.com');

-- Patients (Alex, Bailey). Only insert if not already present.
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