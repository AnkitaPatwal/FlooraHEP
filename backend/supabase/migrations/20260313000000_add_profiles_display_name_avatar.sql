-- Add display_name and avatar_url to profiles (used by mobile Profile page)

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;
