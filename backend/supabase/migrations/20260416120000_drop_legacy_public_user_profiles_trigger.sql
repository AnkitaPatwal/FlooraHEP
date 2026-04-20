-- Signup fix: drop legacy public."user" -> profiles sync trigger.
-- The old trigger used bigint user_id, but profiles.id is now uuid (auth.users.id).
-- Profiles are created from auth.users via handle_new_auth_user(), so this legacy sync must be removed.

begin;

drop trigger if exists trg_on_public_user_created on public."user";
drop function if exists public.handle_new_user_from_public_user();

commit;

