-- ATH-423: Per-assignment (per-patient) exercise overrides & additions for clinician editing.
-- This table lets admins adjust sets/reps, remove template exercises, and add extra exercises
-- without mutating the global plan template (module_exercise).

begin;

create table if not exists public.user_assignment_exercise (
  user_assignment_exercise_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- NOTE: In some envs user_packages.id is bigint (not uuid). This column must match that type.
  assignment_id uuid not null references public.user_packages(id) on delete cascade,
  module_id bigint not null references public.module(module_id) on delete cascade,

  -- For template rows: points at module_exercise row. For added rows: NULL.
  source_module_exercise_id bigint null references public.module_exercise(module_exercise_id) on delete set null,

  -- Exercise being used (required for added rows; redundant for template but stored for easy joins)
  exercise_id bigint not null references public.exercise(exercise_id) on delete restrict,

  -- Used to order added exercises relative to each other; template order remains in module_exercise.order_index.
  order_index integer null check (order_index is null or order_index > 0),

  sets_override integer null check (sets_override is null or sets_override > 0),
  reps_override integer null check (reps_override is null or reps_override > 0),

  -- For template rows: when true, hide this exercise for this assignment.
  is_removed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness:
-- - template override: one row per assignment+module_exercise
-- - added rows: allow multiple, ordered by order_index (can change later)
-- Use a UNIQUE CONSTRAINT (not a partial index) so PostgREST upsert with on_conflict works.
-- Note: source_module_exercise_id is NULL for added rows; UNIQUE allows multiple NULLs.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_assignment_exercise_template_unique'
  ) then
    alter table public.user_assignment_exercise
      add constraint user_assignment_exercise_template_unique
      unique (assignment_id, module_id, source_module_exercise_id);
  end if;
end $$;

create index if not exists uax_assignment_module_idx
  on public.user_assignment_exercise(assignment_id, module_id);

-- updated_at trigger (reuse if exists)
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

drop trigger if exists trg_user_assignment_exercise_updated_at on public.user_assignment_exercise;
create trigger trg_user_assignment_exercise_updated_at
before update on public.user_assignment_exercise
for each row execute function public.set_updated_at();

-- RLS: allow admins via service role (backend uses service role); keep enabled for safety.
alter table public.user_assignment_exercise enable row level security;

commit;

