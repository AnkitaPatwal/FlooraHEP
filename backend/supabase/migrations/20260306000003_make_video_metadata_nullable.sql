-- Make video metadata fields nullable
-- We don't have width, height, duration, or uploader at upload time
-- These can be populated later via video processing or frontend

begin;

-- Make width, height, duration_seconds, and uploader_user_id nullable
alter table public.video alter column width drop not null;
alter table public.video alter column height drop not null;
alter table public.video alter column duration_seconds drop not null;
alter table public.video alter column uploader_user_id drop not null;

-- Update CHECK constraints to allow null
alter table public.video drop constraint if exists video_width_check;
alter table public.video drop constraint if exists video_height_check;
alter table public.video drop constraint if exists video_duration_seconds_check;

alter table public.video add constraint video_width_check 
  check (width is null or width > 0);

alter table public.video add constraint video_height_check 
  check (height is null or height > 0);

alter table public.video add constraint video_duration_seconds_check 
  check (duration_seconds is null or duration_seconds >= 0);

-- Keep foreign key but make it optional
alter table public.video drop constraint if exists video_uploader_user_fk;
alter table public.video add constraint video_uploader_user_fk
  foreign key (uploader_user_id) references "user"(user_id) on delete set null;

commit;