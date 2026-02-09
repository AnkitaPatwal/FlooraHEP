create schema if not exists "test";

drop trigger if exists "trg_muscle_groups_updated_at" on "public"."muscle_groups";

drop trigger if exists "trg_muscles_updated_at" on "public"."muscles";

revoke delete on table "public"."audit_log" from "anon";

revoke insert on table "public"."audit_log" from "anon";

revoke references on table "public"."audit_log" from "anon";

revoke select on table "public"."audit_log" from "anon";

revoke trigger on table "public"."audit_log" from "anon";

revoke truncate on table "public"."audit_log" from "anon";

revoke update on table "public"."audit_log" from "anon";

revoke delete on table "public"."audit_log" from "authenticated";

revoke insert on table "public"."audit_log" from "authenticated";

revoke references on table "public"."audit_log" from "authenticated";

revoke select on table "public"."audit_log" from "authenticated";

revoke trigger on table "public"."audit_log" from "authenticated";

revoke truncate on table "public"."audit_log" from "authenticated";

revoke update on table "public"."audit_log" from "authenticated";

revoke delete on table "public"."audit_log" from "service_role";

revoke insert on table "public"."audit_log" from "service_role";

revoke references on table "public"."audit_log" from "service_role";

revoke select on table "public"."audit_log" from "service_role";

revoke trigger on table "public"."audit_log" from "service_role";

revoke truncate on table "public"."audit_log" from "service_role";

revoke update on table "public"."audit_log" from "service_role";

revoke delete on table "public"."exercise_muscles" from "anon";

revoke insert on table "public"."exercise_muscles" from "anon";

revoke references on table "public"."exercise_muscles" from "anon";

revoke select on table "public"."exercise_muscles" from "anon";

revoke trigger on table "public"."exercise_muscles" from "anon";

revoke truncate on table "public"."exercise_muscles" from "anon";

revoke update on table "public"."exercise_muscles" from "anon";

revoke delete on table "public"."exercise_muscles" from "authenticated";

revoke insert on table "public"."exercise_muscles" from "authenticated";

revoke references on table "public"."exercise_muscles" from "authenticated";

revoke select on table "public"."exercise_muscles" from "authenticated";

revoke trigger on table "public"."exercise_muscles" from "authenticated";

revoke truncate on table "public"."exercise_muscles" from "authenticated";

revoke update on table "public"."exercise_muscles" from "authenticated";

revoke delete on table "public"."exercise_muscles" from "service_role";

revoke insert on table "public"."exercise_muscles" from "service_role";

revoke references on table "public"."exercise_muscles" from "service_role";

revoke select on table "public"."exercise_muscles" from "service_role";

revoke trigger on table "public"."exercise_muscles" from "service_role";

revoke truncate on table "public"."exercise_muscles" from "service_role";

revoke update on table "public"."exercise_muscles" from "service_role";

revoke delete on table "public"."muscle_groups" from "anon";

revoke insert on table "public"."muscle_groups" from "anon";

revoke references on table "public"."muscle_groups" from "anon";

revoke select on table "public"."muscle_groups" from "anon";

revoke trigger on table "public"."muscle_groups" from "anon";

revoke truncate on table "public"."muscle_groups" from "anon";

revoke update on table "public"."muscle_groups" from "anon";

revoke delete on table "public"."muscle_groups" from "authenticated";

revoke insert on table "public"."muscle_groups" from "authenticated";

revoke references on table "public"."muscle_groups" from "authenticated";

revoke select on table "public"."muscle_groups" from "authenticated";

revoke trigger on table "public"."muscle_groups" from "authenticated";

revoke truncate on table "public"."muscle_groups" from "authenticated";

revoke update on table "public"."muscle_groups" from "authenticated";

revoke delete on table "public"."muscle_groups" from "service_role";

revoke insert on table "public"."muscle_groups" from "service_role";

revoke references on table "public"."muscle_groups" from "service_role";

revoke select on table "public"."muscle_groups" from "service_role";

revoke trigger on table "public"."muscle_groups" from "service_role";

revoke truncate on table "public"."muscle_groups" from "service_role";

revoke update on table "public"."muscle_groups" from "service_role";

revoke delete on table "public"."muscles" from "anon";

revoke insert on table "public"."muscles" from "anon";

revoke references on table "public"."muscles" from "anon";

revoke select on table "public"."muscles" from "anon";

revoke trigger on table "public"."muscles" from "anon";

revoke truncate on table "public"."muscles" from "anon";

revoke update on table "public"."muscles" from "anon";

revoke delete on table "public"."muscles" from "authenticated";

revoke insert on table "public"."muscles" from "authenticated";

revoke references on table "public"."muscles" from "authenticated";

revoke select on table "public"."muscles" from "authenticated";

revoke trigger on table "public"."muscles" from "authenticated";

revoke truncate on table "public"."muscles" from "authenticated";

revoke update on table "public"."muscles" from "authenticated";

revoke delete on table "public"."muscles" from "service_role";

revoke insert on table "public"."muscles" from "service_role";

revoke references on table "public"."muscles" from "service_role";

revoke select on table "public"."muscles" from "service_role";

revoke trigger on table "public"."muscles" from "service_role";

revoke truncate on table "public"."muscles" from "service_role";

revoke update on table "public"."muscles" from "service_role";

alter table "public"."audit_log" drop constraint "audit_log_admin_id_fkey";

alter table "public"."audit_log" drop constraint "audit_log_target_user_id_fkey";

alter table "public"."exercise_muscles" drop constraint "exercise_muscles_exercise_id_fkey";

alter table "public"."exercise_muscles" drop constraint "exercise_muscles_muscle_id_fkey";

alter table "public"."muscle_groups" drop constraint "muscle_groups_name_key";

alter table "public"."muscles" drop constraint "muscles_muscle_group_id_fkey";

alter table "public"."muscles" drop constraint "muscles_unique_group_name";

alter table "public"."audit_log" drop constraint "audit_log_pkey";

alter table "public"."exercise_muscles" drop constraint "exercise_muscles_pkey";

alter table "public"."muscle_groups" drop constraint "muscle_groups_pkey";

alter table "public"."muscles" drop constraint "muscles_pkey";

drop index if exists "public"."audit_log_pkey";

drop index if exists "public"."exercise_muscles_pkey";

drop index if exists "public"."idx_em_exercise_id";

drop index if exists "public"."idx_em_muscle_id";

drop index if exists "public"."idx_muscles_group_id";

drop index if exists "public"."muscle_groups_name_key";

drop index if exists "public"."muscle_groups_pkey";

drop index if exists "public"."muscles_pkey";

drop index if exists "public"."muscles_unique_group_name";

drop table "public"."audit_log";

drop table "public"."exercise_muscles";

drop table "public"."muscle_groups";

drop table "public"."muscles";


  create table "public"."password_resets" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "token" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."password_resets" enable row level security;

alter table "public"."user" drop column "role";

drop sequence if exists "public"."audit_log_id_seq";

drop sequence if exists "public"."muscle_groups_id_seq";

drop sequence if exists "public"."muscles_id_seq";

drop type "public"."muscle_role";

drop type "public"."user_role";

CREATE INDEX idx_password_resets_email ON public.password_resets USING btree (email);

CREATE INDEX idx_password_resets_expires_at ON public.password_resets USING btree (expires_at);

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token);

CREATE UNIQUE INDEX password_resets_pkey ON public.password_resets USING btree (id);

CREATE UNIQUE INDEX password_resets_token_key ON public.password_resets USING btree (token);

alter table "public"."password_resets" add constraint "password_resets_pkey" PRIMARY KEY using index "password_resets_pkey";

alter table "public"."password_resets" add constraint "password_resets_token_key" UNIQUE using index "password_resets_token_key";

grant delete on table "public"."password_resets" to "anon";

grant insert on table "public"."password_resets" to "anon";

grant references on table "public"."password_resets" to "anon";

grant select on table "public"."password_resets" to "anon";

grant trigger on table "public"."password_resets" to "anon";

grant truncate on table "public"."password_resets" to "anon";

grant update on table "public"."password_resets" to "anon";

grant delete on table "public"."password_resets" to "authenticated";

grant insert on table "public"."password_resets" to "authenticated";

grant references on table "public"."password_resets" to "authenticated";

grant select on table "public"."password_resets" to "authenticated";

grant trigger on table "public"."password_resets" to "authenticated";

grant truncate on table "public"."password_resets" to "authenticated";

grant update on table "public"."password_resets" to "authenticated";

grant delete on table "public"."password_resets" to "service_role";

grant insert on table "public"."password_resets" to "service_role";

grant references on table "public"."password_resets" to "service_role";

grant select on table "public"."password_resets" to "service_role";

grant trigger on table "public"."password_resets" to "service_role";

grant truncate on table "public"."password_resets" to "service_role";

grant update on table "public"."password_resets" to "service_role";


  create policy "Service role has full access to password_resets"
  on "public"."password_resets"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


