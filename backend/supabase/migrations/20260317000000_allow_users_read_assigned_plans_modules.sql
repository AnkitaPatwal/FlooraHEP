-- Allow authenticated users to read plan_module and module rows for plans they have been assigned.
-- Without these policies, the mobile HomeScreen can fetch user_packages but RLS blocks plan_module and module.
begin;

-- plan_module: users can read rows for plans they have in user_packages
drop policy if exists "users_read_assigned_plan_module" on public.plan_module;
create policy "users_read_assigned_plan_module"
  on public.plan_module
  for select
  to authenticated
  using (
    plan_id in (
      select package_id from public.user_packages where user_id = auth.uid()
    )
  );

-- module: users can read modules that belong to plans they have been assigned
drop policy if exists "users_read_assigned_module" on public.module;
create policy "users_read_assigned_module"
  on public.module
  for select
  to authenticated
  using (
    module_id in (
      select pm.module_id
      from public.plan_module pm
      join public.user_packages up on up.package_id = pm.plan_id
      where up.user_id = auth.uid()
    )
  );

commit;
