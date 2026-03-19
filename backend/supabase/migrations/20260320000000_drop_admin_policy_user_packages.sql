-- Drop admin policy on user_packages to fix "permission denied for table admin_users".
-- The admin assigns packages via the backend (service_role), which bypasses RLS.
-- So we only need users_read_own_user_packages for client reads.
begin;

drop policy if exists "admin_full_access_user_packages" on public.user_packages;

commit;
