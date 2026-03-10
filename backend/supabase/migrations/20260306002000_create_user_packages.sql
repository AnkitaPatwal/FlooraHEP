create table if not exists public.user_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  package_id bigint not null,
  created_at timestamptz not null default now(),

  constraint user_packages_unique unique (user_id, package_id),

  constraint user_packages_user_id_fk
    foreign key (user_id) references auth.users(id) on delete cascade,

  constraint user_packages_package_id_fk
    foreign key (package_id) references public.plan(plan_id) on delete cascade
);