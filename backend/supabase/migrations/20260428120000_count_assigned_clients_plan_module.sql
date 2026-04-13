-- Admin Plans / Sessions cards: distinct auth users assigned per plan (user_packages)
-- and per module/session (merged plan_template + user_assignment_session).

begin;

create or replace function public.count_assigned_clients_for_plans(p_plan_ids bigint[])
returns table (plan_id bigint, client_count bigint)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    u.pid as plan_id,
    coalesce((
      select count(distinct up.user_id)::bigint
      from public.user_packages up
      where up.package_id = u.pid
    ), 0) as client_count
  from unnest(p_plan_ids) as u(pid);
$$;

revoke all on function public.count_assigned_clients_for_plans(bigint[]) from public;
grant execute on function public.count_assigned_clients_for_plans(bigint[]) to service_role;
grant execute on function public.count_assigned_clients_for_plans(bigint[]) to authenticated;

create or replace function public.count_assigned_clients_for_modules(p_module_ids bigint[])
returns table (module_id bigint, client_count bigint)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    u.mid as module_id,
    counts.cnt as client_count
  from unnest(p_module_ids) as u(mid)
  cross join lateral (
    with
    assignments as (
      select up.id as assignment_id, up.user_id, up.package_id as plan_id
      from public.user_packages up
    ),
    effective_module as (
      select a.assignment_id, a.user_id, pm.module_id
      from assignments a
      join public.plan_module pm on pm.plan_id = a.plan_id
      left join public.user_assignment_session uas_t
        on uas_t.assignment_id::text = a.assignment_id::text
        and uas_t.user_id = a.user_id
        and uas_t.source_plan_module_id = pm.plan_module_id
      where coalesce(uas_t.is_removed, false) = false
      union
      select a.assignment_id, a.user_id, uas_a.module_id
      from assignments a
      join public.user_assignment_session uas_a
        on uas_a.assignment_id::text = a.assignment_id::text
        and uas_a.user_id = a.user_id
      where uas_a.source_plan_module_id is null
        and coalesce(uas_a.is_removed, false) = false
    )
    select count(distinct em.user_id)::bigint as cnt
    from effective_module em
    where em.module_id = u.mid
  ) counts;
$$;

revoke all on function public.count_assigned_clients_for_modules(bigint[]) from public;
grant execute on function public.count_assigned_clients_for_modules(bigint[]) to service_role;
grant execute on function public.count_assigned_clients_for_modules(bigint[]) to authenticated;

commit;
