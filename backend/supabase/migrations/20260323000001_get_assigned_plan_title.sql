-- RPC to get the plan title for the current user's most recent assigned package.
-- Uses SECURITY DEFINER to bypass RLS (avoids needing users_read_assigned_plan policy).
create or replace function public.get_assigned_plan_title(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if p_user_id is null or p_user_id != auth.uid() then
    return null;
  end if;

  select p.title into v_title
  from public.user_packages up
  join public.plan p on p.plan_id = up.package_id
  where up.user_id = p_user_id
    and up.package_id is not null
  order by up.created_at desc
  limit 1;

  return v_title;
end;
$$;

grant execute on function public.get_assigned_plan_title(uuid) to authenticated;
