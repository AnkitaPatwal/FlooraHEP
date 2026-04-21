-- Next unlock after completion: follow user_assignment_session.unlock_sequence on the latest
-- published assignment (admin order). Same +7 days timing. Falls back to plan_module.order_index
-- when there is no published layout or the completed module is not on the assignment chain.

begin;

create or replace function public.trg_apply_next_session_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_assignment_id public.user_packages.id%type;
  v_current_seq integer;
  v_next_module bigint;
  v_plan_id bigint;
  v_order integer;
begin
  select up.id
    into v_assignment_id
  from public.user_packages up
  where up.user_id = new.user_id
    and up.session_layout_published_at is not null
  order by up.created_at desc
  limit 1;

  if v_assignment_id is not null then
    select min(uas.unlock_sequence)::integer
      into v_current_seq
    from public.user_assignment_session uas
    where uas.assignment_id = v_assignment_id
      and uas.user_id = new.user_id
      and uas.module_id = new.module_id
      and coalesce(uas.is_removed, false) = false
      and uas.unlock_sequence is not null;

    if v_current_seq is not null then
      select uas.module_id
        into v_next_module
      from public.user_assignment_session uas
      where uas.assignment_id = v_assignment_id
        and uas.user_id = new.user_id
        and coalesce(uas.is_removed, false) = false
        and uas.unlock_sequence is not null
        and uas.unlock_sequence > v_current_seq
      order by uas.unlock_sequence asc, uas.module_id asc
      limit 1;

      if v_next_module is not null then
        insert into public.user_session_unlock (user_id, module_id, unlock_date)
        values (new.user_id, v_next_module, new.completed_at + interval '7 days')
        on conflict (user_id, module_id) do update
          set unlock_date = excluded.unlock_date;
        return new;
      end if;
    end if;
  end if;

  -- Legacy: template plan order (no published layout, or module not on UAS chain)
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

commit;
