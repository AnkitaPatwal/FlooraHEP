-- Task 1 parity: allow completing sessions that were added per-assignment.
-- Existing complete_user_session only validates against template plan_module.
-- This extends validation to include modules present in user_assignment_session
-- for the user's latest assignment (not removed).

begin;

create or replace function public.complete_user_session(p_module_id bigint)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment_id bigint;
  v_plan_id bigint;
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Latest assignment (user_packages row)
  select up.id, up.package_id
    into v_assignment_id, v_plan_id
  from public.user_packages up
  where up.user_id = v_uid
  order by up.created_at desc
  limit 1;

  if v_assignment_id is null then
    raise exception 'no assigned plan';
  end if;

  -- Allowed if in template plan OR explicitly added for this assignment (and not removed).
  select exists (
    select 1
    from public.plan_module pm
    where pm.plan_id = v_plan_id and pm.module_id = p_module_id
  )
  or exists (
    select 1
    from public.user_assignment_session uas
    where uas.assignment_id = v_assignment_id
      and uas.user_id = v_uid
      and uas.module_id = p_module_id
      and coalesce(uas.is_removed, false) = false
  )
  into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'module not in assigned plan';
  end if;

  insert into public.user_session_completion (user_id, module_id, completed_at)
  values (v_uid, p_module_id, now())
  on conflict (user_id, module_id) do update
    set completed_at = excluded.completed_at;
end;
$$;

revoke all on function public.complete_user_session(bigint) from public;
grant execute on function public.complete_user_session(bigint) to authenticated;

commit;

