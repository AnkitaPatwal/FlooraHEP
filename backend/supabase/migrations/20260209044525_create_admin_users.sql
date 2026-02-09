-- FlooraHEP: Admin login storage (hashed passwords, locked-down access)

begin;

-- Supabase convention: install pgcrypto into `extensions` schema so functions resolve consistently
create extension if not exists pgcrypto with schema extensions;

-- Admin login table
create table if not exists public.admin_users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null unique,
  -- Store ONLY hashed passwords here (bcrypt). Trigger below hashes on write.
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_set_updated_at on public.admin_users;
create trigger trg_admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

-- Hashing trigger:
-- If the incoming value doesn't look like a bcrypt hash ($2a/$2b/$2y), hash it.
create or replace function public.admin_users_hash_password()
returns trigger
language plpgsql
as $$
begin
  if new.password_hash is null or length(trim(new.password_hash)) = 0 then
    raise exception 'password_hash cannot be empty';
  end if;

  -- bcrypt hashes start with $2a$, $2b$, or $2y$
  if new.password_hash !~ '^\$2[aby]\$' then
    new.password_hash := extensions.crypt(new.password_hash, extensions.gen_salt('bf', 12));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_users_hash_password on public.admin_users;
create trigger trg_admin_users_hash_password
before insert or update of password_hash on public.admin_users
for each row
execute function public.admin_users_hash_password();

-- Optional: helper to verify a password (server-side use only)
create or replace function public.verify_admin_password(p_email text, p_password text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.email = p_email
      and au.is_active = true
      and au.password_hash = extensions.crypt(p_password, au.password_hash)
  );
$$;

-- Security: lock this table down hard.
alter table public.admin_users enable row level security;

-- Remove default access from client roles
revoke all on table public.admin_users from anon, authenticated;
revoke all on function public.verify_admin_password(text, text) from anon, authenticated;

-- Allow only service_role to manage admin accounts
grant select, insert, update, delete on table public.admin_users to service_role;
grant execute on function public.verify_admin_password(text, text) to service_role;

-- RLS policy for service_role
drop policy if exists "service_role_full_access_admin_users" on public.admin_users;
create policy "service_role_full_access_admin_users"
on public.admin_users
for all
to service_role
using (true)
with check (true);

commit;
