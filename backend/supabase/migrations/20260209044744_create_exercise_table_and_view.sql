begin;

-- Ensure extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- 1) Ensure table exists (minimal shape that won't conflict)
-- NOTE: do NOT include name/title here because older envs may have different schema.
create table if not exists public.exercise (
  exercise_id uuid primary key default gen_random_uuid(),
  video_id    bigint not null references public.video(video_id) on delete restrict,
  created_at  timestamptz not null default now()
);

-- 2) Ensure expected columns exist (safe if already there)
alter table public.exercise
  add column if not exists name        text,
  add column if not exists title       text,
  add column if not exists body_part   text,
  add column if not exists equipment   text,
  add column if not exists level       text,
  add column if not exists tags        text[] not null default '{}'::text[],
  add column if not exists updated_at  timestamptz not null default now();

-- 2b) If one of (name/title) exists but the other is null, backfill for consistency.
--     This avoids surprises when your API/view uses COALESCE(name,title).
do $$
begin
  -- If title exists and name is null, copy title -> name
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exercise' and column_name='title'
  ) then
    execute 'update public.exercise set name = coalesce(name, title) where name is null';
  end if;

  -- If name exists and title is null, copy name -> title
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exercise' and column_name='name'
  ) then
    execute 'update public.exercise set title = coalesce(title, name) where title is null';
  end if;
end $$;

-- 3) updated_at trigger function (only create if missing)
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'set_updated_at' and n.nspname = 'public'
  ) then
    create function public.set_updated_at()
    returns trigger language plpgsql as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end $$;

drop trigger if exists trg_exercise_updated_at on public.exercise;
create trigger trg_exercise_updated_at
before update on public.exercise
for each row execute function public.set_updated_at();

-- 4) Indexes (safe because columns exist now)
create index if not exists idx_exercise_created_at_desc on public.exercise (created_at desc);
create index if not exists idx_exercise_updated_at_desc on public.exercise (updated_at desc);

create index if not exists idx_exercise_body_part  on public.exercise (body_part);
create index if not exists idx_exercise_equipment  on public.exercise (equipment);
create index if not exists idx_exercise_level      on public.exercise (level);
create index if not exists idx_exercise_video_id   on public.exercise (video_id);

create index if not exists idx_exercise_tags_gin   on public.exercise using gin (tags);

-- 4b) Search index: create trigram index on whichever exists & is used
do $$
begin
  -- Prefer title if it exists (common in your earlier schema)
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exercise' and column_name='title'
  ) then
    execute 'create index if not exists idx_exercise_title_trgm on public.exercise using gin (title gin_trgm_ops)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='exercise' and column_name='name'
  ) then
    execute 'create index if not exists idx_exercise_name_trgm on public.exercise using gin (name gin_trgm_ops)';
  end if;
end $$;

-- 5) View (drop & recreate)
-- Exposes a stable "exercise_name" regardless of whether underlying column is title or name.
drop view if exists public.exercise_with_video;

create view public.exercise_with_video as
select
  e.exercise_id,
  coalesce(e.title, e.name) as exercise_name,
  e.body_part,
  e.equipment,
  e.level,
  e.tags,
  e.created_at,
  e.updated_at,
  v.video_id,
  v.bucket as bucket,
  v.object_key as path,
  v.original_filename,
  v.mime_type,
  v.byte_size,
  v.duration_seconds,
  v.width,
  v.height
from public.exercise e
join public.video v on v.video_id = e.video_id;

commit;
