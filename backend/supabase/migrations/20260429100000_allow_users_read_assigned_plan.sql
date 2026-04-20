-- Mobile: assigned plan title for the signed-in user.
-- 1) RLS: allow SELECT on public.plan rows tied to user_packages (direct table reads).
-- 2) RPC: get_my_assigned_plan_title() — reliable when RLS/cache differs; SECURITY DEFINER,
--    still scoped by auth.uid() on user_packages.
begin;

-- ── RLS ─────────────────────────────────────────────────────────────────────
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

-- ── RPC (used by mobile fetchAssignedPlanTitleForCurrentUser) ─────────────────
create or replace function public.get_my_assigned_plan_title()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select trim(both from coalesce(p.title::text, ''))
  from public.user_packages up
  inner join public.plan p on p.plan_id = up.package_id
  where up.user_id = auth.uid()
    and auth.uid() is not null
  order by up.created_at desc nulls last
  limit 1;
$$;

comment on function public.get_my_assigned_plan_title() is
  'Returns plan.title for the current user''s latest assignment (user_packages + plan).';

revoke all on function public.get_my_assigned_plan_title() from public;
grant execute on function public.get_my_assigned_plan_title() to authenticated;

commit;
