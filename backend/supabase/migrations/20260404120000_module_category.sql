-- Session modules: dedicated category column (UI no longer uses description for this).

begin;

alter table public.module add column if not exists category text not null default '';

update public.module
set category = coalesce(nullif(trim(description), ''), '')
where category = '';

commit;
