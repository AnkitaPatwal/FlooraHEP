-- Step 1: Per-assignment unlock order (foundation for Restore → Retrain → Reclaim).
-- Adds unlock_sequence: 0 = first session in merged list, 1 = second, ...
-- Backfill matches assign-package merge: sort by plan_module.order_index (templates)
-- plus user_assignment_session.order_index (added rows), tie-break module_id.
-- Rows with is_removed = true stay NULL.
-- Template slots with no user_assignment_session row are not rows here yet; they keep
-- implicit order from plan_module until the admin API persists phase/slot (later steps).

begin;

alter table public.user_assignment_session
  add column if not exists unlock_sequence integer;

comment on column public.user_assignment_session.unlock_sequence is
  'Order of this session in the patient unlock chain for this assignment (0-based). '
  'NULL if removed or not yet set. Future: aligned with Restore/Retrain/Reclaim grid.';

alter table public.user_assignment_session
  drop constraint if exists user_assignment_session_unlock_sequence_check;

alter table public.user_assignment_session
  add constraint user_assignment_session_unlock_sequence_check
  check (unlock_sequence is null or unlock_sequence >= 0);

-- Clear removed rows (idempotent if re-run)
update public.user_assignment_session
set unlock_sequence = null
where coalesce(is_removed, false) = true;

-- Backfill: sequence = position in merged "included" list per assignment_id
with ap as (
  select up.id as assignment_id, up.package_id as plan_id
  from public.user_packages up
),
tmpl_slots as (
  select
    ap.assignment_id,
    pm.plan_module_id,
    pm.module_id,
    pm.order_index::numeric as sort_key,
    u.user_assignment_session_id
  from ap
  join public.plan_module pm on pm.plan_id = ap.plan_id
  left join public.user_assignment_session u
    on u.assignment_id = ap.assignment_id
   and u.source_plan_module_id = pm.plan_module_id
  where not exists (
    select 1
    from public.user_assignment_session u2
    where u2.assignment_id = ap.assignment_id
      and u2.source_plan_module_id = pm.plan_module_id
      and u2.is_removed = true
  )
),
added_slots as (
  select
    uas.assignment_id,
    null::bigint as plan_module_id,
    uas.module_id,
    coalesce(uas.order_index, 999999)::numeric as sort_key,
    uas.user_assignment_session_id
  from public.user_assignment_session uas
  where uas.source_plan_module_id is null
    and coalesce(uas.is_removed, false) = false
),
unioned as (
  select * from tmpl_slots
  union all
  select * from added_slots
),
ranked as (
  select
    user_assignment_session_id,
    row_number() over (
      partition by assignment_id
      order by sort_key asc, module_id asc
    ) - 1 as seq
  from unioned
)
update public.user_assignment_session u
set unlock_sequence = r.seq
from ranked r
where u.user_assignment_session_id = r.user_assignment_session_id
  and r.user_assignment_session_id is not null;

create index if not exists uas_assignment_unlock_sequence_idx
  on public.user_assignment_session (assignment_id, unlock_sequence);

commit;
