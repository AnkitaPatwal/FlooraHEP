-- ============================================
-- Muscle taxonomy + link to existing public.exercise(id)
-- ============================================

-- 1) Groups
create table if not exists public.muscle_groups (
  id          bigserial primary key,
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Muscles
create table if not exists public.muscles (
  id               bigserial primary key,
  muscle_group_id  bigint not null references public.muscle_groups(id) on delete restrict,
  name             text not null,
  description      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint muscles_unique_group_name unique (muscle_group_id, name)
);
create index if not exists idx_muscles_group_id on public.muscles(muscle_group_id);

-- 3) Role enum (safe if already exists)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'muscle_role') then
    create type muscle_role as enum ('primary','secondary');
  end if;
end $$;

-- 4) Link table → existing exercise(exercise_id BIGINT)
create table if not exists public.exercise_muscles (
  exercise_id bigint not null references public.exercise(exercise_id) on delete cascade,
  muscle_id   bigint not null references public.muscles(id)          on delete restrict,
  role        muscle_role not null default 'primary',
  created_at  timestamptz not null default now(),
  primary key (exercise_id, muscle_id, role)
);

create index if not exists idx_em_exercise_id on public.exercise_muscles(exercise_id);
create index if not exists idx_em_muscle_id   on public.exercise_muscles(muscle_id);


-- 5) updated_at trigger: reuse existing function if present; add only if missing
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'set_updated_at' and n.nspname = 'public'
  ) then
    create or replace function public.set_updated_at()
    returns trigger language plpgsql as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end $$;

drop trigger if exists trg_muscle_groups_updated_at on public.muscle_groups;
create trigger trg_muscle_groups_updated_at
before update on public.muscle_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_muscles_updated_at on public.muscles;
create trigger trg_muscles_updated_at
before update on public.muscles
for each row execute function public.set_updated_at();

-- 6) (Optional) Seed a minimal taxonomy
insert into public.muscle_groups (name, description)
values ('Chest','Anterior upper body'), ('Back','Posterior upper body'), ('Legs','Lower body')
on conflict (name) do nothing;

insert into public.muscles (muscle_group_id, name)
select mg.id, v.mname
from (values
  ('Chest','Pectoralis Major'),
  ('Back','Latissimus Dorsi'),
  ('Legs','Quadriceps')
) as v(gname,mname)
join public.muscle_groups mg on mg.name = v.gname
on conflict (muscle_group_id, name) do nothing;
