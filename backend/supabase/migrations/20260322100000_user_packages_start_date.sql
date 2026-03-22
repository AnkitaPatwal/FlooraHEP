-- ATH: program start date for assigned packages
alter table public.user_packages
  add column if not exists start_date date;

update public.user_packages
set start_date = (created_at at time zone 'utc')::date
where start_date is null;

alter table public.user_packages
  alter column start_date set not null,
  alter column start_date set default (current_date);
