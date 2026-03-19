-- Fix: is_active_admin() throws "permission denied for table admin_users" when called by
-- authenticated users during RLS evaluation. Catch the error and return false so the
-- users_read_own_user_packages policy can still allow access.
begin;

create or replace function public.is_active_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.admin_users
    where email = auth.email()
      and is_active = true
  );
exception when insufficient_privilege or undefined_table or others then
  return false;
end;
$$;

commit;
