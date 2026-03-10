begin;

-- If profiles.id is bigint, we cannot safely convert existing values to uuid.
-- In local dev reset, the simplest fix is to drop and recreate profiles correctly.

drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

commit;