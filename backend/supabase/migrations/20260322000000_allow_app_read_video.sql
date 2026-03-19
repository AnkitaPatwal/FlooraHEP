-- Allow app to read video table (bucket, object_key) to construct public URLs for playback
begin;

drop policy if exists "app_can_select_video" on public.video;
create policy "app_can_select_video"
  on public.video
  for select
  to anon, authenticated
  using (true);

commit;
