-- ATH-426 follow-up: definer functions must insert into RLS tables; row_security off for body.
-- Run in SQL Editor if unlock/completion rows never appear after RPC.

create or replace function public.trg_apply_next_session_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id bigint;
  v_order integer;
  v_next_module bigint;
begin
  select up.package_id, pm.order_index
    into v_plan_id, v_order
  from public.user_packages up
  join public.plan_module pm
    on pm.plan_id = up.package_id and pm.module_id = new.module_id
  where up.user_id = new.user_id
  order by up.created_at desc
  limit 1;

  if v_plan_id is null or v_order is null then
    return new;
  end if;

  select pm.module_id
    into v_next_module
  from public.plan_module pm
  where pm.plan_id = v_plan_id and pm.order_index = v_order + 1
  limit 1;

  if v_next_module is not null then
    insert into public.user_session_unlock (user_id, module_id, unlock_date)
    values (new.user_id, v_next_module, new.completed_at + interval '7 days')
    on conflict (user_id, module_id) do update
      set unlock_date = excluded.unlock_date;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_first_session_unlock()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_plan_id bigint;
  v_start_at timestamptz;
  v_first_module bigint;
  v_unlock timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select up.package_id, up.start_date
    into v_plan_id, v_start_at
  from public.user_packages up
  where up.user_id = v_uid
  order by up.created_at desc
  limit 1;

  if v_plan_id is null then
    return;
  end if;

  select pm.module_id
    into v_first_module
  from public.plan_module pm
  where pm.plan_id = v_plan_id
  order by pm.order_index asc
  limit 1;

  if v_first_module is null then
    return;
  end if;

  v_unlock := greatest(now(), coalesce(v_start_at, now()));

  insert into public.user_session_unlock (user_id, module_id, unlock_date)
  values (v_uid, v_first_module, v_unlock)
  on conflict (user_id, module_id) do nothing;
end;
$$;

create or replace function public.complete_user_session(p_module_id bigint)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1
    from public.user_packages up
    join public.plan_module pm
      on pm.plan_id = up.package_id and pm.module_id = p_module_id
    where up.user_id = v_uid
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
