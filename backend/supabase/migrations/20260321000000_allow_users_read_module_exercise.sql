-- Allow users to read module_exercise for modules in their assigned plans
begin;

drop policy if exists "admin_full_access_module_exercise" on public.module_exercise;

create policy "users_read_assigned_module_exercise"
  on public.module_exercise
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
