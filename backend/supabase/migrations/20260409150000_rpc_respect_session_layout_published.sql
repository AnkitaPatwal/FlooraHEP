-- Mobile: no assigned session list / unlock bootstrap until session layout is published.

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
    select up.id as assignment_id
    from public.user_packages up
    where up.user_id = auth.uid()
      and up.session_layout_published_at is not null
    order by up.created_at desc
    limit 1
  )
  select
    uas.module_id::bigint,
    uas.unlock_sequence::integer as order_index,
    m.title::text
  from public.user_assignment_session uas
  join latest_assignment la on la.assignment_id = uas.assignment_id
  join public.module m on m.module_id = uas.module_id
  where uas.user_id = auth.uid()
    and coalesce(uas.is_removed, false) = false
    and uas.unlock_sequence is not null
  order by uas.unlock_sequence asc, uas.module_id asc;
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
  v_start_at timestamptz;
  v_first_module bigint;
  v_unlock timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select uas.module_id, la.start_date
    into v_first_module, v_start_at
  from (
    select up.id as assignment_id, up.start_date
    from public.user_packages up
    where up.user_id = v_uid
      and up.session_layout_published_at is not null
    order by up.created_at desc
    limit 1
  ) la
  join public.user_assignment_session uas
    on uas.assignment_id = la.assignment_id
   and uas.user_id = v_uid
   and coalesce(uas.is_removed, false) = false
   and uas.unlock_sequence is not null
  order by uas.unlock_sequence asc, uas.module_id asc
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

commit;
