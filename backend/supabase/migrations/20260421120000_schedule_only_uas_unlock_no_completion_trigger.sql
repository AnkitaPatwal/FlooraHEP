-- Schedule-only unlocks: precomputed at publish (start_date + 7d * unlock_sequence).
-- The trigger trg_uas_completion_next_unlock overwrote those dates with completed_at + 7 days,
-- which broke the calendar (e.g. April 20 → April 28 after completing session 1).
-- Drop it so only bootstrapScheduledSessionUnlocksForUser (and republish) sets unlock_date.
-- Access still requires: scheduled date reached AND previous session completed (app + admin API).

begin;

drop trigger if exists trg_uas_completion_next_unlock on public.user_assignment_session_completion;

drop function if exists public.trg_apply_next_uas_unlock();

-- Repair existing rows: align unlock_date with the same formula as bootstrap (UTC calendar date + 7n days).
update public.user_assignment_session_unlock uu
set unlock_date = (
  (
    ((up.start_date at time zone 'utc')::date + uas.unlock_sequence * interval '7 days')
    at time zone 'utc'
  )
)
from public.user_assignment_session uas
inner join public.user_packages up on up.id = uas.assignment_id
where uu.user_id = uas.user_id
  and uu.user_assignment_session_id = uas.user_assignment_session_id
  and coalesce(uas.is_removed, false) = false
  and uas.unlock_sequence is not null
  and up.session_layout_published_at is not null;

commit;
