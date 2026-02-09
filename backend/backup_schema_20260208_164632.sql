


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "test";


ALTER SCHEMA "test" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user_from_public_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.user_id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_from_public_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin', false )
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_user_id"() RETURNS bigint
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(
           (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'),
           ''
         )::bigint
$$;


ALTER FUNCTION "public"."jwt_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin" (
    "user_id" bigint NOT NULL
);

ALTER TABLE ONLY "public"."admin" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise" (
    "exercise_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "default_sets" integer,
    "default_reps" integer,
    "video_id" bigint,
    "thumbnail_photo_id" bigint,
    "created_by_admin_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exercise_default_reps_check" CHECK ((("default_reps" IS NULL) OR ("default_reps" > 0))),
    CONSTRAINT "exercise_default_sets_check" CHECK ((("default_sets" IS NULL) OR ("default_sets" > 0)))
);

ALTER TABLE ONLY "public"."exercise" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise" OWNER TO "postgres";


ALTER TABLE "public"."exercise" ALTER COLUMN "exercise_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."exercise_exercise_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."exercise_tag" (
    "exercise_id" bigint NOT NULL,
    "tag_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."exercise_tag" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_tag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module" (
    "module_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "session_number" integer NOT NULL,
    "available_date" "date",
    "created_by_admin_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "module_session_number_check" CHECK (("session_number" > 0))
);

ALTER TABLE ONLY "public"."module" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."module" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."module_exercise" (
    "module_exercise_id" bigint NOT NULL,
    "module_id" bigint NOT NULL,
    "exercise_id" bigint NOT NULL,
    "order_index" integer NOT NULL,
    "sets_override" integer,
    "reps_override" integer,
    CONSTRAINT "module_exercise_order_index_check" CHECK (("order_index" > 0)),
    CONSTRAINT "module_exercise_reps_override_check" CHECK ((("reps_override" IS NULL) OR ("reps_override" > 0))),
    CONSTRAINT "module_exercise_sets_override_check" CHECK ((("sets_override" IS NULL) OR ("sets_override" > 0)))
);

ALTER TABLE ONLY "public"."module_exercise" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_exercise" OWNER TO "postgres";


ALTER TABLE "public"."module_exercise" ALTER COLUMN "module_exercise_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."module_exercise_module_exercise_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."module" ALTER COLUMN "module_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."module_module_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."password_resets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_resets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient" (
    "user_id" bigint NOT NULL,
    "profile_photo_id" bigint
);

ALTER TABLE ONLY "public"."patient" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photo" (
    "photo_id" bigint NOT NULL,
    "bucket" "text" NOT NULL,
    "object_key" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "byte_size" bigint NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "uploader_user_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "photo_byte_size_check" CHECK (("byte_size" >= 0)),
    CONSTRAINT "photo_height_check" CHECK (("height" > 0)),
    CONSTRAINT "photo_width_check" CHECK (("width" > 0))
);

ALTER TABLE ONLY "public"."photo" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo" OWNER TO "postgres";


ALTER TABLE "public"."photo" ALTER COLUMN "photo_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."photo_photo_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" bigint NOT NULL,
    "email" "text",
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."smoke_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."smoke_tasks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."smoke_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."smoke_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "qty" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."smoke_widgets" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."smoke_widgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag" (
    "tag_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by_admin_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."tag" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag" OWNER TO "postgres";


ALTER TABLE "public"."tag" ALTER COLUMN "tag_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."tag_tag_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user" (
    "user_id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "fname" "text" NOT NULL,
    "lname" "text" NOT NULL,
    "status" boolean DEFAULT false
);

ALTER TABLE ONLY "public"."user" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_exercise" (
    "user_exercise_id" bigint NOT NULL,
    "user_id" bigint NOT NULL,
    "exercise_id" bigint NOT NULL,
    "source_user_module_id" bigint,
    "source_module_exercise_id" bigint,
    "num_sets_override" integer,
    "num_reps_override" integer,
    "order_index" integer,
    "notes" "text",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_exercise_num_reps_override_check" CHECK ((("num_reps_override" IS NULL) OR ("num_reps_override" > 0))),
    CONSTRAINT "user_exercise_num_sets_override_check" CHECK ((("num_sets_override" IS NULL) OR ("num_sets_override" > 0))),
    CONSTRAINT "user_exercise_order_index_check" CHECK ((("order_index" IS NULL) OR ("order_index" > 0)))
);

ALTER TABLE ONLY "public"."user_exercise" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_exercise" OWNER TO "postgres";


ALTER TABLE "public"."user_exercise" ALTER COLUMN "user_exercise_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_exercise_user_exercise_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_module" (
    "user_module_id" bigint NOT NULL,
    "user_id" bigint NOT NULL,
    "module_id" bigint NOT NULL,
    "assigned_by_admin_id" bigint NOT NULL,
    "available_at" timestamp with time zone,
    "notes" "text",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."user_module" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_module" OWNER TO "postgres";


ALTER TABLE "public"."user_module" ALTER COLUMN "user_module_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_module_user_module_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."user" ALTER COLUMN "user_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."video" (
    "video_id" bigint NOT NULL,
    "bucket" "text" NOT NULL,
    "object_key" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "byte_size" bigint NOT NULL,
    "duration_seconds" integer NOT NULL,
    "width" integer NOT NULL,
    "height" integer NOT NULL,
    "uploader_user_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "video_byte_size_check" CHECK (("byte_size" >= 0)),
    CONSTRAINT "video_duration_seconds_check" CHECK (("duration_seconds" >= 0)),
    CONSTRAINT "video_height_check" CHECK (("height" > 0)),
    CONSTRAINT "video_width_check" CHECK (("width" > 0))
);

ALTER TABLE ONLY "public"."video" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."video" OWNER TO "postgres";


ALTER TABLE "public"."video" ALTER COLUMN "video_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."video_video_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admin"
    ADD CONSTRAINT "admin_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_pkey" PRIMARY KEY ("exercise_id");



ALTER TABLE ONLY "public"."exercise_tag"
    ADD CONSTRAINT "exercise_tag_pk" PRIMARY KEY ("exercise_id", "tag_id");



ALTER TABLE ONLY "public"."module_exercise"
    ADD CONSTRAINT "module_exercise_pkey" PRIMARY KEY ("module_exercise_id");



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_pkey" PRIMARY KEY ("module_id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_resets"
    ADD CONSTRAINT "password_resets_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."photo"
    ADD CONSTRAINT "photo_pkey" PRIMARY KEY ("photo_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smoke_tasks"
    ADD CONSTRAINT "smoke_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smoke_widgets"
    ADD CONSTRAINT "smoke_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag"
    ADD CONSTRAINT "tag_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tag"
    ADD CONSTRAINT "tag_pkey" PRIMARY KEY ("tag_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_exercise"
    ADD CONSTRAINT "user_exercise_pkey" PRIMARY KEY ("user_exercise_id");



ALTER TABLE ONLY "public"."user_module"
    ADD CONSTRAINT "user_module_pkey" PRIMARY KEY ("user_module_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."video"
    ADD CONSTRAINT "video_pkey" PRIMARY KEY ("video_id");



CREATE INDEX "idx_module_exercise_exercise_id" ON "public"."module_exercise" USING "btree" ("exercise_id");



CREATE INDEX "idx_module_exercise_module_id" ON "public"."module_exercise" USING "btree" ("module_id");



CREATE INDEX "idx_password_resets_email" ON "public"."password_resets" USING "btree" ("email");



CREATE INDEX "idx_password_resets_expires_at" ON "public"."password_resets" USING "btree" ("expires_at");



CREATE INDEX "idx_password_resets_token" ON "public"."password_resets" USING "btree" ("token");



CREATE INDEX "idx_photo_uploader_user_id" ON "public"."photo" USING "btree" ("uploader_user_id");



CREATE INDEX "idx_tag_is_active" ON "public"."tag" USING "btree" ("is_active");



CREATE INDEX "idx_user_exercise_exercise_id" ON "public"."user_exercise" USING "btree" ("exercise_id");



CREATE INDEX "idx_user_exercise_user_id" ON "public"."user_exercise" USING "btree" ("user_id");



CREATE INDEX "idx_user_module_module_id" ON "public"."user_module" USING "btree" ("module_id");



CREATE INDEX "idx_user_module_user_id" ON "public"."user_module" USING "btree" ("user_id");



CREATE INDEX "idx_video_uploader_user_id" ON "public"."video" USING "btree" ("uploader_user_id");



CREATE UNIQUE INDEX "profiles_email_unique_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_id_idx" ON "public"."profiles" USING "btree" ("id");



CREATE OR REPLACE TRIGGER "trg_exercise_updated_at" BEFORE UPDATE ON "public"."exercise" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_module_updated_at" BEFORE UPDATE ON "public"."module" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_on_public_user_created" AFTER INSERT ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_from_public_user"();



CREATE OR REPLACE TRIGGER "trg_profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tag_updated_at" BEFORE UPDATE ON "public"."tag" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."admin"
    ADD CONSTRAINT "admin_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_created_by_admin_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exercise_tag"
    ADD CONSTRAINT "exercise_tag_exercise_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("exercise_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_tag"
    ADD CONSTRAINT "exercise_tag_tag_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("tag_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_thumb_fk" FOREIGN KEY ("thumbnail_photo_id") REFERENCES "public"."photo"("photo_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_video_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("video_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."module"
    ADD CONSTRAINT "module_created_by_admin_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."module_exercise"
    ADD CONSTRAINT "module_exercise_exercise_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("exercise_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."module_exercise"
    ADD CONSTRAINT "module_exercise_module_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("module_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_profile_photo_fk" FOREIGN KEY ("profile_photo_id") REFERENCES "public"."photo"("photo_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient"
    ADD CONSTRAINT "patient_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo"
    ADD CONSTRAINT "photo_uploader_user_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag"
    ADD CONSTRAINT "tag_created_by_admin_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_exercise"
    ADD CONSTRAINT "user_exercise_exercise_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("exercise_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_exercise"
    ADD CONSTRAINT "user_exercise_src_me_fk" FOREIGN KEY ("source_module_exercise_id") REFERENCES "public"."module_exercise"("module_exercise_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_exercise"
    ADD CONSTRAINT "user_exercise_src_um_fk" FOREIGN KEY ("source_user_module_id") REFERENCES "public"."user_module"("user_module_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_exercise"
    ADD CONSTRAINT "user_exercise_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_module"
    ADD CONSTRAINT "user_module_assigned_by_admin_fk" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "public"."admin"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_module"
    ADD CONSTRAINT "user_module_module_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("module_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_module"
    ADD CONSTRAINT "user_module_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video"
    ADD CONSTRAINT "video_uploader_user_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."user"("user_id") ON DELETE RESTRICT;



CREATE POLICY "Service role has full access to password_resets" ON "public"."password_resets" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_tag" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_exercise" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_resets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_admin_select" ON "public"."patient" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "patient_owner_select" ON "public"."patient" FOR SELECT USING (("user_id" = "public"."jwt_user_id"()));



CREATE POLICY "patient_owner_update" ON "public"."patient" FOR UPDATE USING (("user_id" = "public"."jwt_user_id"()));



ALTER TABLE "public"."photo" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own_by_email" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user" "u"
  WHERE (("u"."user_id" = "profiles"."id") AND ("u"."email" = ("auth"."jwt"() ->> 'email'::"text"))))));



ALTER TABLE "public"."smoke_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."smoke_widgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_admin_select" ON "public"."user" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."user_exercise" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_module" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_owner_select" ON "public"."user" FOR SELECT USING (("user_id" = "public"."jwt_user_id"()));



CREATE POLICY "user_owner_update" ON "public"."user" FOR UPDATE USING (("user_id" = "public"."jwt_user_id"()));



ALTER TABLE "public"."video" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user_from_public_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_from_public_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_from_public_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."jwt_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jwt_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin" TO "anon";
GRANT ALL ON TABLE "public"."admin" TO "authenticated";
GRANT ALL ON TABLE "public"."admin" TO "service_role";



GRANT ALL ON TABLE "public"."exercise" TO "anon";
GRANT ALL ON TABLE "public"."exercise" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exercise_exercise_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exercise_exercise_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exercise_exercise_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_tag" TO "anon";
GRANT ALL ON TABLE "public"."exercise_tag" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_tag" TO "service_role";



GRANT ALL ON TABLE "public"."module" TO "anon";
GRANT ALL ON TABLE "public"."module" TO "authenticated";
GRANT ALL ON TABLE "public"."module" TO "service_role";



GRANT ALL ON TABLE "public"."module_exercise" TO "anon";
GRANT ALL ON TABLE "public"."module_exercise" TO "authenticated";
GRANT ALL ON TABLE "public"."module_exercise" TO "service_role";



GRANT ALL ON SEQUENCE "public"."module_exercise_module_exercise_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."module_exercise_module_exercise_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."module_exercise_module_exercise_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."module_module_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."module_module_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."module_module_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."password_resets" TO "anon";
GRANT ALL ON TABLE "public"."password_resets" TO "authenticated";
GRANT ALL ON TABLE "public"."password_resets" TO "service_role";



GRANT ALL ON TABLE "public"."patient" TO "anon";
GRANT ALL ON TABLE "public"."patient" TO "authenticated";
GRANT ALL ON TABLE "public"."patient" TO "service_role";



GRANT ALL ON TABLE "public"."photo" TO "anon";
GRANT ALL ON TABLE "public"."photo" TO "authenticated";
GRANT ALL ON TABLE "public"."photo" TO "service_role";



GRANT ALL ON SEQUENCE "public"."photo_photo_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."photo_photo_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."photo_photo_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."smoke_tasks" TO "anon";
GRANT ALL ON TABLE "public"."smoke_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."smoke_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."smoke_widgets" TO "anon";
GRANT ALL ON TABLE "public"."smoke_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."smoke_widgets" TO "service_role";



GRANT ALL ON TABLE "public"."tag" TO "anon";
GRANT ALL ON TABLE "public"."tag" TO "authenticated";
GRANT ALL ON TABLE "public"."tag" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tag_tag_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tag_tag_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tag_tag_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."user_exercise" TO "anon";
GRANT ALL ON TABLE "public"."user_exercise" TO "authenticated";
GRANT ALL ON TABLE "public"."user_exercise" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_exercise_user_exercise_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_exercise_user_exercise_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_exercise_user_exercise_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_module" TO "anon";
GRANT ALL ON TABLE "public"."user_module" TO "authenticated";
GRANT ALL ON TABLE "public"."user_module" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_module_user_module_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_module_user_module_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_module_user_module_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."video" TO "anon";
GRANT ALL ON TABLE "public"."video" TO "authenticated";
GRANT ALL ON TABLE "public"."video" TO "service_role";



GRANT ALL ON SEQUENCE "public"."video_video_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."video_video_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."video_video_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































