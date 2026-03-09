-- Add case-insensitive unique constraint on exercise title to prevent duplicates.
-- Uses LOWER(TRIM(title)) for normalization.
-- Note: If existing data has duplicate titles, this migration will fail; clean up duplicates first.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_title_unique_lower
  ON public.exercise (LOWER(TRIM(title)));

COMMIT;
