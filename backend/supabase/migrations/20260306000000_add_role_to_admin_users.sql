-- Add role column for admin access control

alter table admin_users
add column if not exists role text;

-- Set default role for existing rows
update admin_users
set role = 'admin'
where role is null;

-- Default role for new admins
alter table admin_users
alter column role set default 'admin';

-- Restrict role values
alter table admin_users
drop constraint if exists admin_users_role_check;

alter table admin_users
add constraint admin_users_role_check
check (role in ('admin', 'super_admin'));