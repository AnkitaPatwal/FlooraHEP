-- ATH-423: Per-assignment (per-patient) session overrides/additions (module list) for clinician editing.
-- Mirrors user_assignment_exercise: allows removing template sessions and adding extra sessions
-- without mutating the global plan template (plan_module).

begin;

create table if not exists public.user_assignment_session (
  user_assignment_session_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- In some envs user_packages.id is bigint.
  assignment_id uuid not null references public.user_packages(id) on delete cascade,
  module_id bigint not null references public.module(module_id) on delete cascade,

  -- For template sessions: points at plan_module row. For added sessions: NULL.
  source_plan_module_id bigint null references public.plan_module(plan_module_id) on delete set null,

  -- For added sessions ordering relative to other added sessions.
  order_index integer null check (order_index is null or order_index > 0),

  is_removed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For template overrides, ensure one row per assignment+plan_module.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_assignment_session_template_unique'
  ) then
    alter table public.user_assignment_session
      add constraint user_assignment_session_template_unique
      unique (assignment_id, source_plan_module_id);
  end if;
end $$;

create index if not exists uas_assignment_idx
  on public.user_assignment_session(assignment_id, module_id);

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

drop trigger if exists trg_user_assignment_session_updated_at on public.user_assignment_session;
create trigger trg_user_assignment_session_updated_at
before update on public.user_assignment_session
for each row execute function public.set_updated_at();

alter table public.user_assignment_session enable row level security;

commit;

