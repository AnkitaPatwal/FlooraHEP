-- Fix user_packages.user_id: ensure it is UUID (auth.users.id), not bigint.
-- If the column is bigint (legacy), migrate data by mapping public.user.user_id -> auth.users.id via email.

begin;

do $$
declare
  col_type text;
  has_uuid_col boolean;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'user_packages'
    and column_name = 'user_id';

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_packages'
      and column_name = 'user_id_uuid'
  ) into has_uuid_col;

  if col_type = 'bigint' then
    -- Drop RLS policy that depends on user_id (must be dropped before column)
    drop policy if exists "users_read_own_user_packages" on public.user_packages;

    -- Drop FK and unique constraint (they reference user_id)
    alter table public.user_packages drop constraint if exists user_packages_user_id_fk;
    alter table public.user_packages drop constraint if exists user_packages_unique;

    -- Add new uuid column (skip if partial run already added it)
    if not has_uuid_col then
      alter table public.user_packages add column user_id_uuid uuid;

      -- Populate: map public.user.user_id (bigint) -> auth.users.id (uuid) via email
      update public.user_packages up
      set user_id_uuid = au.id
      from public."user" u
      join auth.users au on au.email = u.email
      where u.user_id = up.user_id;

      -- Remove orphan rows (no matching auth.users) - they would be invalid after migration
      delete from public.user_packages where user_id_uuid is null;
    end if;

    -- Drop old column and rename
    alter table public.user_packages drop column user_id;
    alter table public.user_packages rename column user_id_uuid to user_id;
    alter table public.user_packages alter column user_id set not null;

    -- Re-add constraints
    alter table public.user_packages
      add constraint user_packages_user_id_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
    alter table public.user_packages
      add constraint user_packages_unique unique (user_id, package_id);

    -- Recreate RLS policy (user_id is now uuid, auth.uid() is uuid)
    create policy "users_read_own_user_packages"
    on public.user_packages
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end $$;

commit;
