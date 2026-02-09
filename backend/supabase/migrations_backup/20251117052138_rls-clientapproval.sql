alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_by_email" on public.profiles;

create policy "profiles_select_own_by_email"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public."user" u
    where u.user_id = profiles.id
      and u.email = (auth.jwt() ->> 'email')
  )
);
