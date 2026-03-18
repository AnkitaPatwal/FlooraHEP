-- Fix profiles for UUID-based auth: RLS policies + trigger to create profile on signup
-- profiles.id is UUID (auth.users.id); RLS was broken (compared bigint user_id to uuid)

begin;

-- 1. Fix RLS: profiles.id is UUID, use auth.uid() directly
drop policy if exists "profiles_select_own_by_email" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- 2. Allow users to update their own profile (for avatar, display_name, etc.)
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3. Trigger: create profile when new user signs up in auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 4. Backfill: ensure existing auth.users have a profiles row
insert into public.profiles (id, email)
select au.id, au.email
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;

commit;
