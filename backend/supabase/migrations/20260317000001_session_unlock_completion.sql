-- Session unlock logic + completion tracking
-- Jira: Unlock Logic + Completion Tracking
--
-- Schema:
--   user_session_completion: user_id (UUID), module_id, completed_at
--   user_session_unlock: user_id (UUID), module_id, unlock_date
--
-- Logic:
--   Session 1 unlocks immediately on first visit (or from user_packages.start_date)
--   Completing Session N sets Session N+1 unlock_date = now() + 7 days
--   "Current session" = lowest-numbered unlocked session not yet completed

begin;

-- 1. Add start_date to user_packages (for Session 1 unlock_date initialization)
alter table public.user_packages
  add column if not exists start_date timestamptz;

-- 2. user_session_completion
create table if not exists public.user_session_completion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id bigint not null references public.module(module_id) on delete cascade,
  completed_at timestamptz not null default now(),
  constraint user_session_completion_unique unique (user_id, module_id)
);

create index if not exists idx_user_session_completion_user
  on public.user_session_completion(user_id);

-- 3. user_session_unlock
create table if not exists public.user_session_unlock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id bigint not null references public.module(module_id) on delete cascade,
  unlock_date timestamptz not null,
  constraint user_session_unlock_unique unique (user_id, module_id)
);

create index if not exists idx_user_session_unlock_user
  on public.user_session_unlock(user_id);

-- 4. Enable RLS
alter table public.user_session_completion enable row level security;
alter table public.user_session_unlock enable row level security;

-- 5. RLS policies: users can only access their own rows
drop policy if exists "users_own_completion" on public.user_session_completion;
create policy "users_own_completion"
  on public.user_session_completion
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users_own_unlock" on public.user_session_unlock;
create policy "users_own_unlock"
  on public.user_session_unlock
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 6. Function: ensure Session 1 is unlocked for user (lazy init on first visit)
create or replace function public.ensure_session_1_unlocked(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_first_module_id bigint;
  v_start_date timestamptz;
  v_exists boolean;
begin
  if p_user_id is null or p_user_id != auth.uid() then
    return;
  end if;

  -- Get user's package
  select package_id into v_package_id
  from public.user_packages
  where user_id = p_user_id
  limit 1;

  if v_package_id is null then
    return;
  end if;

  -- Get first module (Session 1) by order_index
  select pm.module_id into v_first_module_id
  from public.plan_module pm
  where pm.plan_id = v_package_id
  order by pm.order_index asc
  limit 1;

  if v_first_module_id is null then
    return;
  end if;

  -- Check if already unlocked
  select exists (
    select 1 from public.user_session_unlock
    where user_id = p_user_id and module_id = v_first_module_id
  ) into v_exists;

  if v_exists then
    return;
  end if;

  -- Use start_date from user_packages, or now()
  select coalesce(up.start_date, now()) into v_start_date
  from public.user_packages up
  where up.user_id = p_user_id and up.package_id = v_package_id;

  insert into public.user_session_unlock (user_id, module_id, unlock_date)
  values (p_user_id, v_first_module_id, coalesce(v_start_date, now()))
  on conflict (user_id, module_id) do nothing;
end;
$$;

-- 7. Function: complete session (idempotent), sets N+1 unlock_date = now() + 7 days
create or replace function public.complete_session(p_user_id uuid, p_module_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_id bigint;
  v_order_idx int;
  v_next_module_id bigint;
  v_unlock_date timestamptz;
begin
  if p_user_id is null or p_user_id != auth.uid() then
    return;
  end if;

  -- Insert completion (idempotent: ON CONFLICT DO NOTHING)
  insert into public.user_session_completion (user_id, module_id, completed_at)
  values (p_user_id, p_module_id, now())
  on conflict (user_id, module_id) do nothing;

  -- Get user's package and this module's order_index
  select up.package_id, pm.order_index into v_package_id, v_order_idx
  from public.user_packages up
  join public.plan_module pm on pm.plan_id = up.package_id and pm.module_id = p_module_id
  where up.user_id = p_user_id
  limit 1;

  if v_package_id is null or v_order_idx is null then
    return;
  end if;

  -- Get next module (Session N+1)
  select pm.module_id into v_next_module_id
  from public.plan_module pm
  where pm.plan_id = v_package_id
    and pm.order_index = v_order_idx + 1
  limit 1;

  -- If no next module (last session), do nothing
  if v_next_module_id is null then
    return;
  end if;

  v_unlock_date := now() + interval '7 days';

  insert into public.user_session_unlock (user_id, module_id, unlock_date)
  values (p_user_id, v_next_module_id, v_unlock_date)
  on conflict (user_id, module_id) do update
  set unlock_date = greatest(user_session_unlock.unlock_date, excluded.unlock_date);
end;
$$;

-- 8. Grant execute to authenticated users
grant execute on function public.ensure_session_1_unlocked(uuid) to authenticated;
grant execute on function public.complete_session(uuid, bigint) to authenticated;

commit;
