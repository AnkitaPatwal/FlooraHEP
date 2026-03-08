-- ATH-246: Upload Exercise Videos to Supabase Storage
-- Seed: insert one video record into the exercise-videos bucket
--       and link it to exercise_id = 19 (pelvic tilt).
--
-- Notes:
-- - Avoid hardcoding uploader_user_id; look it up by email.
-- - This migration is idempotent (safe to rerun).
-- - Creates the uploader user if missing (dev-friendly).

BEGIN;

-- Step 0: Ensure uploader user exists (dev seed)
-- (Adjust columns if your user table requires more/less fields.)
INSERT INTO public."user" (email, password, fname, lname)
SELECT
  'kayla.garibay31@gmail.com',
  'demo',        -- dev-only placeholder
  'Kayla',
  'Garibay'
WHERE NOT EXISTS (
  SELECT 1
  FROM public."user"
  WHERE email = 'kayla.garibay31@gmail.com'
);

-- Step 1: Insert the seed video record (skip if already seeded)
INSERT INTO public.video (
  bucket,
  object_key,
  original_filename,
  mime_type,
  byte_size,
  duration_seconds,
  width,
  height,
  uploader_user_id
)
SELECT
  'exercise-videos',
  'pelvic-tilt-demo.mp4',
  'pelvic-tilt-demo.mp4',
  'video/mp4',
  10485760,   -- 10 MB placeholder
  30,
  1280,
  720,
  u.user_id
FROM public."user" u
WHERE u.email = 'kayla.garibay31@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.video WHERE object_key = 'pelvic-tilt-demo.mp4'
  );

-- Step 2: Link the video to exercise_id = 19 (pelvic tilt)
UPDATE public.exercise e
SET video_id = v.video_id
FROM public.video v
WHERE v.object_key = 'pelvic-tilt-demo.mp4'
  AND e.exercise_id = 19
  AND e.video_id IS NULL;

COMMIT;