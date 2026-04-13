-- Session (module) client counts: plan assignments + overrides, plus legacy user_module rows.

begin;

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
    coalesce((
      select count(*)::bigint
      from (
        select distinct fused.uid
        from (
          select em.user_id::text as uid
          from (
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
              where coalesce(uas_a.is_removed, false) = false
            )
            select assignment_id, user_id, module_id from effective_module
          ) em
          where em.module_id = u.mid
          union all
          select ('um:' || um.user_id::text) as uid
          from public.user_module um
          where um.module_id = u.mid
        ) fused
      ) d
    ), 0) as client_count
  from unnest(p_module_ids) as u(mid);
$$;

revoke all on function public.count_assigned_clients_for_modules(bigint[]) from public;
grant execute on function public.count_assigned_clients_for_modules(bigint[]) to service_role;
grant execute on function public.count_assigned_clients_for_modules(bigint[]) to authenticated;

commit;
