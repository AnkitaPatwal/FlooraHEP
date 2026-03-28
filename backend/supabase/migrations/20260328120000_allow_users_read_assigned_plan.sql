-- Mobile HomeScreen reads plan.title for the user's assigned package (plan_id = package_id).
-- RLS previously allowed only admins on public.plan, so patients saw no title and some clients could stall.

begin;

drop policy if exists "users_read_assigned_plan" on public.plan;
create policy "users_read_assigned_plan"
  on public.plan
  for select
  to authenticated
  using (
    plan_id in (
      select up.package_id
      from public.user_packages up
      where up.user_id = auth.uid()
    )
  );

commit;
