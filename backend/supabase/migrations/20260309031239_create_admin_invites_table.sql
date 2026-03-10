create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz null,
  created_by_email text null,
  created_at timestamptz not null default now()
);

create index if not exists admin_invites_email_idx
  on public.admin_invites (email);

create index if not exists admin_invites_token_idx
  on public.admin_invites (token);