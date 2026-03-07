-- ATH-393: Add role column to admin_users + make video upload fields nullable
-- 
-- Part 1: Add role to admin_users
-- role defaults to 'admin'; set specific rows to 'super_admin' manually after.
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'super_admin'));

-- Part 2: Make video fields nullable
-- Context: admins are in admin_users (uuid), NOT in public."user" (bigint).
-- The FK video.uploader_user_id → "user"(user_id) cannot be satisfied by an admin.
-- duration_seconds, width, height are unknown at web upload time.
ALTER TABLE public.video
  ALTER COLUMN uploader_user_id DROP NOT NULL,
  ALTER COLUMN duration_seconds DROP NOT NULL,
  ALTER COLUMN width             DROP NOT NULL,
  ALTER COLUMN height            DROP NOT NULL;

-- Drop and re-add FK as nullable
ALTER TABLE public.video
  DROP CONSTRAINT IF EXISTS video_uploader_user_fk;

ALTER TABLE public.video
  ADD CONSTRAINT video_uploader_user_fk
  FOREIGN KEY (uploader_user_id)
  REFERENCES "user"(user_id)
  ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;