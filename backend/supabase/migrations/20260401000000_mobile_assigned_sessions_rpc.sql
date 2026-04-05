-- Mobile parity (task 1): expose merged assigned sessions list for current user.
-- This reads template plan_module + per-assignment overrides (user_assignment_session)
-- and returns the ordered session list the patient should see.

begin;

create or replace function public.get_current_assigned_sessions()
returns table (
  module_id bigint,
  order_index integer,
  title text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  with latest_assignment as (
    select up.id as assignment_id, up.package_id as plan_id
    from public.user_packages up
    where up.user_id = auth.uid()
    order by up.created_at desc
    limit 1
  ),
  template_sessions as (
    select
      pm.plan_module_id,
      pm.module_id,
      pm.order_index
    from public.plan_module pm
    join latest_assignment la on la.plan_id = pm.plan_id
  ),
  overrides as (
    select
      uas.source_plan_module_id,
      uas.module_id,
      uas.order_index,
      uas.is_removed
    from public.user_assignment_session uas
    join latest_assignment la on la.assignment_id = uas.assignment_id
    where uas.user_id = auth.uid()
  ),
  template_included as (
    select
      ts.module_id,
      ts.order_index,
      m.title
    from template_sessions ts
    join public.module m on m.module_id = ts.module_id
    left join overrides o on o.source_plan_module_id = ts.plan_module_id
    where coalesce(o.is_removed, false) = false
  ),
  added_included as (
    select
      o.module_id,
      coalesce(o.order_index, 999999)::integer as order_index,
      m.title
    from overrides o
    join public.module m on m.module_id = o.module_id
    where o.source_plan_module_id is null
      and coalesce(o.is_removed, false) = false
  )
  select module_id, order_index, title
  from template_included
  union all
  select module_id, order_index, title
  from added_included
  order by order_index asc, module_id asc;
$$;

revoke all on function public.get_current_assigned_sessions() from public;
grant execute on function public.get_current_assigned_sessions() to authenticated;

commit;

