-- Allow mobile app (anon/authenticated) to read exercises for the dashboard.
-- Service role keeps exclusive write access via existing policies.
BEGIN;

DROP POLICY IF EXISTS "app_can_select_exercise" ON public.exercise;
CREATE POLICY "app_can_select_exercise"
  ON public.exercise
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
