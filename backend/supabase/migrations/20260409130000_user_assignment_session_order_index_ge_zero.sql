-- Allow order_index = 0 so it can match unlock_sequence 0 (Restore, first column).
-- Previously: check (order_index is null or order_index > 0) rejected slot 0 inserts.

begin;

alter table public.user_assignment_session
  drop constraint if exists user_assignment_session_order_index_check;

alter table public.user_assignment_session
  add constraint user_assignment_session_order_index_check
  check (order_index is null or order_index >= 0);

commit;
