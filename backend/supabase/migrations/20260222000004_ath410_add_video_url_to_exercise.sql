-- ATH-410: Add video_url column to exercise table
-- Stores the public URL of the uploaded video directly on the exercise row.
-- Nullable so existing exercises without videos are unaffected.

BEGIN;

ALTER TABLE public.exercise
  ADD COLUMN IF NOT EXISTS video_url TEXT NULL;

-- RLS policy: only service_role can update video_url
-- (service_role is used by supabaseServer on the backend)
-- This effectively means only super_admin can update it via our backend,
-- since the endpoint is protected by requireSuperAdmin middleware.
DROP POLICY IF EXISTS "service_role_can_update_exercise_video_url" ON public.exercise;

CREATE POLICY "service_role_can_update_exercise_video_url"
  ON public.exercise
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service_role to select exercises too
DROP POLICY IF EXISTS "service_role_can_select_exercise" ON public.exercise;

CREATE POLICY "service_role_can_select_exercise"
  ON public.exercise
  FOR SELECT
  TO service_role
  USING (true);

COMMIT;