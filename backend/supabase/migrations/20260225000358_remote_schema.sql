alter table "public"."admin" add column "auth_user_id" uuid;

alter table "public"."exercise" disable row level security;

alter table "public"."module" disable row level security;

alter table "public"."module_exercise" disable row level security;

alter table "public"."admin" add constraint "admin_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin" validate constraint "admin_auth_user_id_fkey";


  create policy "dev read exercises"
  on "public"."exercise"
  as permissive
  for select
  to public
using (true);



  create policy "dev read modules"
  on "public"."module"
  as permissive
  for select
  to public
using (true);



  create policy "dev read module_exercise"
  on "public"."module_exercise"
  as permissive
  for select
  to public
using (true);


do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'realtime'
      and table_name = 'subscription'
  ) then
    execute 'CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='buckets')
     and exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage' and p.proname='enforce_bucket_name_length') then
    execute 'drop trigger if exists enforce_bucket_name_length_trigger on storage.buckets';
    execute 'CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='buckets')
     and exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage' and p.proname='protect_delete') then
    execute 'drop trigger if exists protect_buckets_delete on storage.buckets';
    execute 'CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='objects')
     and exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage' and p.proname='protect_delete') then
    execute 'drop trigger if exists protect_objects_delete on storage.objects';
    execute 'CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()';
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='objects')
     and exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage' and p.proname='update_updated_at_column') then
    execute 'drop trigger if exists update_objects_updated_at on storage.objects';
    execute 'CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()';
  end if;
end $$;


