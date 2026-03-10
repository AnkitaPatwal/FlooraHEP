-- Editable plan categories: admins create and name categories; no seed data.
-- plan.category_id is optional; NULL means "Uncategorized".

begin;

-- 1. Create plan_category table
create table if not exists public.plan_category (
  category_id   bigint generated always as identity primary key,
  name          text not null,
  created_at    timestamptz not null default now(),
  constraint plan_category_name_unique unique (name)
);

-- 2. Add category_id to plan (nullable; NULL = Uncategorized)
alter table public.plan
  add column if not exists category_id bigint null
  references public.plan_category(category_id) on delete set null;

-- 3. RLS for plan_category (admin full access, same pattern as plan)
alter table public.plan_category enable row level security;

drop policy if exists "admin_full_access_plan_category" on public.plan_category;
create policy "admin_full_access_plan_category"
on public.plan_category
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

commit;
