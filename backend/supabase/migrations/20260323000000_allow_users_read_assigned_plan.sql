-- Allow users to read plan rows (e.g. title) for plans they are assigned to.
-- Used by mobile HomeScreen to display plan name above "Your Sessions".
drop policy if exists "users_read_assigned_plan" on public.plan;
create policy "users_read_assigned_plan"
  on public.plan
  for select
  to authenticated
  using (
    plan_id in (
      select package_id from public.user_packages where user_id = auth.uid()
    )
  );
