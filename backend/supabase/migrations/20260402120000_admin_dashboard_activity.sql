-- Optional feed entries for actions we cannot infer from row timestamps (e.g. deletes).
create table if not exists public.admin_dashboard_activity (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  message text not null
);

create index if not exists idx_admin_dashboard_activity_created_at_desc
  on public.admin_dashboard_activity (created_at desc);

grant insert, select on public.admin_dashboard_activity to service_role;
