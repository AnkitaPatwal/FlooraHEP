-- Policies for public.user and public.patient using JWT:
-- - Owners: request.jwt.claims.user_id (bigint) matches row's user_id
-- - Admin:  request.jwt.claims.role = 'admin'

-- helper: admin check
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin', false )
$$;

-- helper: current user_id from JWT (bigint)
create or replace function public.jwt_user_id() returns bigint
language sql stable as $$
  select nullif(
           (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'),
           ''
         )::bigint
$$;


-- USER table policies
alter table public."user" enable row level security;
alter table public."user" force  row level security;

drop policy if exists "user_owner_select" on public."user";
drop policy if exists "user_owner_update" on public."user";
drop policy if exists "user_admin_select" on public."user";

create policy "user_owner_select"
on public."user"
for select
using ( user_id = (public.jwt_user_id())::bigint );

create policy "user_owner_update"
on public."user"
for update
using ( user_id = (public.jwt_user_id())::bigint );

create policy "user_admin_select"
on public."user"
for select
using ( public.is_admin() );

-- PATIENT table policies
alter table public.patient enable row level security;
alter table public.patient force  row level security;

drop policy if exists "patient_owner_select" on public.patient;
drop policy if exists "patient_owner_update" on public.patient;
drop policy if exists "patient_admin_select" on public.patient;

create policy "patient_owner_select"
on public.patient
for select
using ( user_id = (public.jwt_user_id())::bigint );

create policy "patient_owner_update"
on public.patient
for update
using ( user_id = (public.jwt_user_id())::bigint );

create policy "patient_admin_select"
on public.patient
for select
using ( public.is_admin() );
