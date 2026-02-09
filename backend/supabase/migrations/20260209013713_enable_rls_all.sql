do $$
declare r record;
begin
for r in
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
and table_schema = 'public'
loop
begin
execute format('alter table %I.%I enable row level security;', r.table_schema, r.table_name);
execute format('alter table %I.%I force  row level security;', r.table_schema, r.table_name);
    exception
when insufficient_privilege then
        raise notice 'Skipping %.% due to ownership/privilege', r.table_schema, r.table_name;
when others then
        raise notice 'Skipping %.% due to: %', r.table_schema, r.table_name, sqlerrm;
end;
end loop;
end$$;
