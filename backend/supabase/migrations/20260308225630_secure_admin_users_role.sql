-- Migration to enforce RLS and column-level security on admin_users.role

BEGIN;

-- Ensure RLS is enabled on admin_users (already done, but good practice to enforce)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon and authenticated on the entire table (if not already)
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;

-- Explicitly revoke UPDATE on the role column from anon and authenticated
REVOKE UPDATE (role) ON TABLE public.admin_users FROM anon, authenticated;

-- Ensure service_role retains full access to allow the backend API to manage roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO service_role;

-- (Optional) If an authenticated user is ever granted UPDATE on admin_users in the future,
-- we ensure they cannot modify the role column by keeping the column privilege revoked.

COMMIT;
