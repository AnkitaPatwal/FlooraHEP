- Fix created_by_admin_id to reference admin_users (UUID) instead of admin (BIGINT)
-- This aligns with the JWT auth system which uses admin_users.id (UUID)

begin;

-- Step 1: Drop existing foreign key constraints
alter table public.exercise drop constraint if exists exercise_created_by_admin_fk;
alter table public.tag drop constraint if exists tag_created_by_admin_fk;
alter table public.module drop constraint if exists module_created_by_admin_fk;
alter table public.plan drop constraint if exists plan_created_by_admin_fk;

-- Step 2: Make columns nullable temporarily (to allow type change)
alter table public.exercise alter column created_by_admin_id drop not null;
alter table public.tag alter column created_by_admin_id drop not null;
alter table public.module alter column created_by_admin_id drop not null;
alter table public.plan alter column created_by_admin_id drop not null;

-- Step 3: Change column types from BIGINT to UUID
-- Using NULL here intentionally because bigint ids cannot be safely cast to uuid.
alter table public.exercise alter column created_by_admin_id type uuid using null;
alter table public.tag alter column created_by_admin_id type uuid using null;
alter table public.module alter column created_by_admin_id type uuid using null;
alter table public.plan alter column created_by_admin_id type uuid using null;

-- Step 4: Backfill NULLs if a default admin exists
do $$
declare
  default_admin_id uuid;
begin
  select id into default_admin_id
  from public.admin_users
  where is_active = true
  order by (role = 'super_admin') desc, created_at asc
  limit 1;

  if default_admin_id is not null then
    update public.exercise set created_by_admin_id = default_admin_id where created_by_admin_id is null;
    update public.tag set created_by_admin_id = default_admin_id where created_by_admin_id is null;
    update public.module set created_by_admin_id = default_admin_id where created_by_admin_id is null;
    update public.plan set created_by_admin_id = default_admin_id where created_by_admin_id is null;

    -- Only restore NOT NULL if we successfully backfilled everything
    alter table public.exercise alter column created_by_admin_id set not null;
    alter table public.tag alter column created_by_admin_id set not null;
    alter table public.module alter column created_by_admin_id set not null;
    alter table public.plan alter column created_by_admin_id set not null;
  end if;
end $$;

-- Step 5: Add foreign key constraints to reference admin_users(id)
-- These will allow NULL values if the column remains nullable (local dev without seeded super admin).
alter table public.exercise add constraint exercise_created_by_admin_fk
  foreign key (created_by_admin_id) references public.admin_users(id) on delete restrict;

alter table public.tag add constraint tag_created_by_admin_fk
  foreign key (created_by_admin_id) references public.admin_users(id) on delete restrict;

alter table public.module add constraint module_created_by_admin_fk
  foreign key (created_by_admin_id) references public.admin_users(id) on delete restrict;

alter table public.plan add constraint plan_created_by_admin_fk
  foreign key (created_by_admin_id) references public.admin_users(id) on delete restrict;

commit;