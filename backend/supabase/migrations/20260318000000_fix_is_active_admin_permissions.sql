-- Fix: is_active_admin() needs to read admin_users but the function owner lacked permission.
-- When RLS evaluates admin policies, it calls is_active_admin() which reads admin_users.
-- 1. Grant postgres SELECT on admin_users
-- 2. Make postgres the function owner so SECURITY DEFINER runs with postgres privileges
begin;

grant select on public.admin_users to postgres;
alter function public.is_active_admin() owner to postgres;

commit;
