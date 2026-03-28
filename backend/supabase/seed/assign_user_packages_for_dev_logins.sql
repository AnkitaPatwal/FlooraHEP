-- Runs after dev_seed.sql (see config.toml db.seed.sql_paths).
-- Links auth.users (Supabase login) to a real plan when both exist.
-- On a fresh db reset there are no auth users yet — run this again from SQL Editor
-- after you sign up, or run: supabase db execute --file supabase/seed/assign_user_packages_for_dev_logins.sql
-- (CLI flag varies by version; Dashboard SQL Editor is fine.)
--
-- Patient test emails from dev_seed + any extra dev account you use.

insert into public.user_packages (user_id, package_id, start_date)
select
  au.id,
  p.plan_id,
  coalesce((au.created_at at time zone 'utc')::date, current_date)
from auth.users au
cross join lateral (
  select plan_id
  from public.plan
  order by plan_id asc
  limit 1
) p
where lower(au.email) in (
  'alex@example.com',
  'bailey@example.com',
  'carlos@example.com',
  'diana@example.com',
  'ethan@example.com'
)
and not exists (
  select 1 from public.user_packages up where up.user_id = au.id
)
on conflict (user_id, package_id) do nothing;
