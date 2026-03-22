-- ATH-411: Profile Picture Upload — avatars Storage bucket
-- Path format: avatars/{user_id}/{timestamp}.jpg
-- Only service_role uploads via Edge Function; bucket is public for read
-- Conditional: storage.buckets schema varies (storage disabled vs enabled, CLI versions).
-- Only insert when the public column exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
  ) AND NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
  END IF;
END $$;
