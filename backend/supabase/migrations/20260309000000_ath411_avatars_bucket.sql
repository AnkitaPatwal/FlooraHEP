INSERT INTO storage.buckets (id, name)
SELECT 'avatars', 'avatars'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);