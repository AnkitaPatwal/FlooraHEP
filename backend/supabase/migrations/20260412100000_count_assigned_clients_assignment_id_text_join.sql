-- Join user_packages.id and assignment override FKs via text so uuid vs bigint ids still match.

begin;

create or replace function public.count_assigned_clients_for_exercises(p_exercise_ids bigint[])
returns table (exercise_id bigint, client_count bigint)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    u.eid,
    counts.cnt
  from unnest(p_exercise_ids) as u(eid)
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
    ),
    template_hits as (
      select distinct a.user_id
      from assignments a
      join public.plan_module pm on pm.plan_id = a.plan_id
      join public.module_exercise me on me.module_id = pm.module_id and me.exercise_id = u.eid
      join effective_module em
        on em.assignment_id::text = a.assignment_id::text
        and em.user_id = a.user_id
        and em.module_id = me.module_id
      left join public.user_assignment_exercise uax
        on uax.assignment_id::text = a.assignment_id::text
        and uax.user_id = a.user_id
        and uax.module_id = me.module_id
        and uax.source_module_exercise_id = me.module_exercise_id
      where coalesce(uax.is_removed, false) = false
    ),
    added_hits as (
      select distinct a.user_id
      from assignments a
      join public.user_assignment_exercise uax
        on uax.assignment_id::text = a.assignment_id::text
        and uax.user_id = a.user_id
      join effective_module em
        on em.assignment_id::text = a.assignment_id::text
        and em.user_id = a.user_id
        and em.module_id = uax.module_id
      where uax.exercise_id = u.eid
        and uax.source_module_exercise_id is null
        and coalesce(uax.is_removed, false) = false
    )
    select count(*)::bigint as cnt
    from (
      select user_id from template_hits
      union
      select user_id from added_hits
    ) x
  ) counts;
$$;

revoke all on function public.count_assigned_clients_for_exercises(bigint[]) from public;
grant execute on function public.count_assigned_clients_for_exercises(bigint[]) to service_role;
grant execute on function public.count_assigned_clients_for_exercises(bigint[]) to authenticated;

commit;
