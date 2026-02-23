-- ATH-246: Upload Exercise Videos to Supabase Storage
-- Seed: insert one video record into the exercise-videos bucket
--       and link it to exercise_id = 19 (pelvic tilt).
--
-- Prerequisites already satisfied by earlier migrations:
--   • video table with BIGINT PK exists      (20251102211852_main_schema.sql)
--   • exercise.video_id BIGINT FK exists     (20251102211852_main_schema.sql)
--   • exercise-videos bucket exists in Storage (created manually in Supabase dashboard)
--
-- NOTE: video.uploader_user_id is NOT NULL, so we use the seeded admin user_id = 19.
--       Adjust if your admin user_id differs.

BEGIN;

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
  19          -- admin user_id who owns this upload
WHERE NOT EXISTS (
  SELECT 1 FROM public.video WHERE object_key = 'pelvic-tilt-demo.mp4'
);

-- Step 2: Link the video to exercise_id = 19 (pelvic tilt)
UPDATE public.exercise
SET video_id = (
  SELECT video_id FROM public.video
  WHERE object_key = 'pelvic-tilt-demo.mp4'
  LIMIT 1
)
WHERE exercise_id = 19
  AND video_id IS NULL;

COMMIT;