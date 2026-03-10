begin;

-- Remove old dev policies (insecure)
drop policy if exists "dev read modules" on public.module;
drop policy if exists "dev read module_exercise" on public.module_exercise;

-- Enable RLS
alter table public.module enable row level security;
alter table public.plan enable row level security;
alter table public.plan_module enable row level security;
alter table public.module_exercise enable row level security;
alter table public.user_packages enable row level security;

-- =========================
-- Admin full access policies
-- =========================

-- module
drop policy if exists "admin_full_access_module" on public.module;
create policy "admin_full_access_module"
on public.module
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- plan
drop policy if exists "admin_full_access_plan" on public.plan;
create policy "admin_full_access_plan"
on public.plan
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- plan_module
drop policy if exists "admin_full_access_plan_module" on public.plan_module;
create policy "admin_full_access_plan_module"
on public.plan_module
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- module_exercise
drop policy if exists "admin_full_access_module_exercise" on public.module_exercise;
create policy "admin_full_access_module_exercise"
on public.module_exercise
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- user_packages (admin full access)
drop policy if exists "admin_full_access_user_packages" on public.user_packages;
create policy "admin_full_access_user_packages"
on public.user_packages
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- ==================================
-- End-user policy (own assignments)
-- ==================================

drop policy if exists "users_read_own_user_packages" on public.user_packages;
create policy "users_read_own_user_packages"
on public.user_packages
for select
to authenticated
using (user_id::text = auth.uid()::text);

commit;