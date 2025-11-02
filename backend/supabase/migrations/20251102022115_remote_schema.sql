
  create table "public"."smoke_widgets" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "qty" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


CREATE UNIQUE INDEX smoke_widgets_pkey ON public.smoke_widgets USING btree (id);

alter table "public"."smoke_widgets" add constraint "smoke_widgets_pkey" PRIMARY KEY using index "smoke_widgets_pkey";

grant delete on table "public"."smoke_widgets" to "anon";

grant insert on table "public"."smoke_widgets" to "anon";

grant references on table "public"."smoke_widgets" to "anon";

grant select on table "public"."smoke_widgets" to "anon";

grant trigger on table "public"."smoke_widgets" to "anon";

grant truncate on table "public"."smoke_widgets" to "anon";

grant update on table "public"."smoke_widgets" to "anon";

grant delete on table "public"."smoke_widgets" to "authenticated";

grant insert on table "public"."smoke_widgets" to "authenticated";

grant references on table "public"."smoke_widgets" to "authenticated";

grant select on table "public"."smoke_widgets" to "authenticated";

grant trigger on table "public"."smoke_widgets" to "authenticated";

grant truncate on table "public"."smoke_widgets" to "authenticated";

grant update on table "public"."smoke_widgets" to "authenticated";

grant delete on table "public"."smoke_widgets" to "service_role";

grant insert on table "public"."smoke_widgets" to "service_role";

grant references on table "public"."smoke_widgets" to "service_role";

grant select on table "public"."smoke_widgets" to "service_role";

grant trigger on table "public"."smoke_widgets" to "service_role";

grant truncate on table "public"."smoke_widgets" to "service_role";

grant update on table "public"."smoke_widgets" to "service_role";


