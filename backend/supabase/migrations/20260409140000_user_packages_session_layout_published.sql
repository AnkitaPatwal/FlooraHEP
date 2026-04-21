-- Patient sees assigned sessions / first unlock only after clinician publishes layout from Edit User (or auto-publish on Assign Package).
-- Existing assignments: treat as already published so mobile keeps working.

begin;

alter table public.user_packages
  add column if not exists session_layout_published_at timestamptz;

comment on column public.user_packages.session_layout_published_at is
  'When set, patient app may list sessions and run unlock bootstrap. Null = draft layout (Edit User).';

update public.user_packages
set session_layout_published_at = coalesce(created_at, now())
where session_layout_published_at is null;

commit;
