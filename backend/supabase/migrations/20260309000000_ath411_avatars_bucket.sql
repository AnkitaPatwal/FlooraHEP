-- ATH-411: Profile Picture Upload — avatars Storage bucket
-- Path format: avatars/{user_id}/{timestamp}.jpg
-- Only service_role uploads via Edge Function; bucket is public for read
--
-- Local Supabase storage schema varies by CLI version: some buckets tables omit
-- the "public" column or require it quoted. Branch on column presence.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'public'
  ) then
    execute $ins$
      insert into storage.buckets (id, name, "public")
      select 'avatars', 'avatars', true
      where not exists (select 1 from storage.buckets where id = 'avatars')
    $ins$;
  else
    execute $ins$
      insert into storage.buckets (id, name)
      select 'avatars', 'avatars'
      where not exists (select 1 from storage.buckets where id = 'avatars')
    $ins$;
  end if;
end $$;
