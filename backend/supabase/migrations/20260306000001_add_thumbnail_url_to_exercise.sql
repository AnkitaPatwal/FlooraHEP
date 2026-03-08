-- Add thumbnail_url column to exercise table for direct URL storage
-- Similar to video_url from ATH-410, this allows frontend to display thumbnails
-- without joining to the photo table.

BEGIN;

-- Add thumbnail_url column (nullable, no default)
ALTER TABLE public.exercise
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.exercise.thumbnail_url IS 
  'Public URL for exercise thumbnail. Set by backend after Supabase Storage upload.';

COMMIT;
