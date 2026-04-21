-- Instance-scoped unlock/completion: support duplicate module_id rows in an assignment chain.
-- Patient progress should be per user_assignment_session row, not per module_id.

begin;

create table if not exists public.user_assignment_session_completion (
  user_id uuid not null references auth.users (id) on delete cascade,
  user_assignment_session_id uuid not null references public.user_assignment_session (user_assignment_session_id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, user_assignment_session_id)
);

create index if not exists uas_completion_user_idx
  on public.user_assignment_session_completion (user_id);

create table if not exists public.user_assignment_session_unlock (
  user_id uuid not null references auth.users (id) on delete cascade,
  user_assignment_session_id uuid not null references public.user_assignment_session (user_assignment_session_id) on delete cascade,
  unlock_date timestamptz not null,
  primary key (user_id, user_assignment_session_id)
);

create index if not exists uas_unlock_user_idx
  on public.user_assignment_session_unlock (user_id);

alter table public.user_assignment_session_completion enable row level security;
alter table public.user_assignment_session_unlock enable row level security;

drop policy if exists "users_read_own_uas_completion" on public.user_assignment_session_completion;
create policy "users_read_own_uas_completion"
  on public.user_assignment_session_completion
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_read_own_uas_unlock" on public.user_assignment_session_unlock;
create policy "users_read_own_uas_unlock"
  on public.user_assignment_session_unlock
  for select
  to authenticated
  using (user_id = auth.uid());

-- Unlock next session instance in 7 days when one is completed (published chain only).
create or replace function public.trg_apply_next_uas_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := new.user_id;
  v_assignment_id public.user_packages.id%type;
  v_current_seq integer;
  v_next_uas_id uuid;
begin
  select uas.assignment_id, uas.unlock_sequence
    into v_assignment_id, v_current_seq
  from public.user_assignment_session uas
  where uas.user_assignment_session_id = new.user_assignment_session_id
    and uas.user_id = v_uid
    and coalesce(uas.is_removed, false) = false
    and uas.unlock_sequence is not null
  limit 1;

  if v_assignment_id is null or v_current_seq is null then
    return new;
  end if;

  -- Ensure we're on a published assignment (draft assignments shouldn't unlock patient content).
  if not exists (
    select 1
    from public.user_packages up
    where up.id = v_assignment_id
      and up.user_id = v_uid
      and up.session_layout_published_at is not null
  ) then
    return new;
  end if;

  select uas2.user_assignment_session_id
    into v_next_uas_id
  from public.user_assignment_session uas2
  where uas2.assignment_id = v_assignment_id
    and uas2.user_id = v_uid
    and coalesce(uas2.is_removed, false) = false
    and uas2.unlock_sequence is not null
    and uas2.unlock_sequence > v_current_seq
  order by uas2.unlock_sequence asc, uas2.module_id asc, uas2.user_assignment_session_id asc
  limit 1;

  if v_next_uas_id is null then
    return new;
  end if;

  insert into public.user_assignment_session_unlock (user_id, user_assignment_session_id, unlock_date)
  values (v_uid, v_next_uas_id, new.completed_at + interval '7 days')
  on conflict (user_id, user_assignment_session_id) do update
    set unlock_date = excluded.unlock_date;

  return new;
end;
$$;

drop trigger if exists trg_uas_completion_next_unlock on public.user_assignment_session_completion;
create trigger trg_uas_completion_next_unlock
after insert or update of completed_at on public.user_assignment_session_completion
for each row
execute procedure public.trg_apply_next_uas_unlock();

-- RPC: complete a specific session instance (used by mobile when last exercise finishes).
create or replace function public.complete_user_assignment_session(p_user_assignment_session_id uuid)
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
    from public.user_assignment_session uas
    join public.user_packages up on up.id = uas.assignment_id
    where uas.user_assignment_session_id = p_user_assignment_session_id
      and uas.user_id = v_uid
      and coalesce(uas.is_removed, false) = false
      and uas.unlock_sequence is not null
      and up.session_layout_published_at is not null
  ) into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'session not in published assignment chain';
  end if;

  insert into public.user_assignment_session_completion (user_id, user_assignment_session_id, completed_at)
  values (v_uid, p_user_assignment_session_id, now())
  on conflict (user_id, user_assignment_session_id) do update
    set completed_at = excluded.completed_at;
end;
$$;

revoke all on function public.complete_user_assignment_session(uuid) from public;
grant execute on function public.complete_user_assignment_session(uuid) to authenticated;

commit;

