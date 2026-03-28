-- Reliable plan title for mobile Dashboard when direct select on public.plan is blocked by RLS edge cases.
-- Only returns a title for the caller's own user_packages row (newest assignment first).
begin;

create or replace function public.get_my_assigned_plan_title()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.title::text
  from public.user_packages up
  join public.plan p on p.plan_id = up.package_id
  where up.user_id = auth.uid()
  order by up.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_assigned_plan_title() from public;
grant execute on function public.get_my_assigned_plan_title() to authenticated;

commit;
