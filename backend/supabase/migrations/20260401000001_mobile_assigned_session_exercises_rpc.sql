-- Mobile parity (task 1): expose merged assigned exercise list for a module (session)
-- for the current signed-in user.
--
-- Merges:
-- - template: module_exercise (+ exercise fields)
-- - per-assignment overrides/additions: user_assignment_exercise
--
-- Ordering:
-- - template follows module_exercise.order_index
-- - added follows user_assignment_exercise.order_index (null => end)
--
-- Removal:
-- - template rows can be removed via user_assignment_exercise.is_removed=true
--
-- Prescription:
-- - sets/reps resolved with precedence: assignment override > template override > exercise defaults > 1

begin;

create or replace function public.get_current_assigned_session_exercises(p_module_id bigint)
returns table (
  exercise_id bigint,
  order_index integer,
  title text,
  description text,
  thumbnail_url text,
  video_url text,
  sets integer,
  reps integer
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  with latest_assignment as (
    select up.id as assignment_id, up.package_id as plan_id
    from public.user_packages up
    where up.user_id = auth.uid()
    order by up.created_at desc
    limit 1
  ),
  -- Ensure the module is actually part of the current assigned sessions list:
  -- either in the template plan OR explicitly added for this assignment (and not removed).
  module_allowed as (
    select 1 as ok
    from latest_assignment la
    where exists (
      select 1
      from public.plan_module pm
      where pm.plan_id = la.plan_id and pm.module_id = p_module_id
    )
    or exists (
      select 1
      from public.user_assignment_session uas
      where uas.assignment_id = la.assignment_id
        and uas.user_id = auth.uid()
        and uas.module_id = p_module_id
        and uas.source_plan_module_id is null
        and coalesce(uas.is_removed, false) = false
    )
  ),
  overrides as (
    select
      uax.source_module_exercise_id,
      uax.exercise_id,
      uax.order_index,
      uax.sets_override,
      uax.reps_override,
      uax.is_removed
    from public.user_assignment_exercise uax
    join latest_assignment la on la.assignment_id = uax.assignment_id
    where uax.user_id = auth.uid()
      and uax.module_id = p_module_id
  ),
  template_included as (
    select
      me.exercise_id,
      me.order_index,
      coalesce(e.title, e.name, '') as title,
      coalesce(e.description, '') as description,
      e.thumbnail_url,
      e.video_url,
      coalesce(o.sets_override, me.sets_override, e.default_sets, 1)::integer as sets,
      coalesce(o.reps_override, me.reps_override, e.default_reps, 1)::integer as reps
    from public.module_exercise me
    join public.exercise e on e.exercise_id = me.exercise_id
    left join overrides o on o.source_module_exercise_id = me.module_exercise_id
    where me.module_id = p_module_id
      and exists (select 1 from module_allowed)
      and coalesce(o.is_removed, false) = false
  ),
  added_included as (
    select
      o.exercise_id,
      coalesce(o.order_index, 999999)::integer as order_index,
      coalesce(e.title, e.name, '') as title,
      coalesce(e.description, '') as description,
      e.thumbnail_url,
      e.video_url,
      coalesce(o.sets_override, e.default_sets, 1)::integer as sets,
      coalesce(o.reps_override, e.default_reps, 1)::integer as reps
    from overrides o
    join public.exercise e on e.exercise_id = o.exercise_id
    where o.source_module_exercise_id is null
      and coalesce(o.is_removed, false) = false
      and exists (select 1 from module_allowed)
  )
  select exercise_id, order_index, title, description, thumbnail_url, video_url, sets, reps
  from template_included
  union all
  select exercise_id, order_index, title, description, thumbnail_url, video_url, sets, reps
  from added_included
  order by order_index asc, exercise_id asc;
$$;

revoke all on function public.get_current_assigned_session_exercises(bigint) from public;
grant execute on function public.get_current_assigned_session_exercises(bigint) to authenticated;

commit;

