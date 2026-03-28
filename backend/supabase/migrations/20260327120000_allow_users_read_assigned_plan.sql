-- Allow authenticated users to read plan rows for packages they have been assigned.
-- Required for mobile Dashboard: user_packages → plan (title) and direct plan lookups.
begin;

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

commit;
