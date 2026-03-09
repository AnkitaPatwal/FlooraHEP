-- ATH-411: Profile Picture Upload — avatars Storage bucket
-- Path format: avatars/{user_id}/{timestamp}.jpg
-- Only service_role uploads via Edge Function; bucket is public for read

INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars');
