## Local Supabase
Prereqs: Docker Desktop, Node.js, Supabase CLI

First-time:
1) cp .env.example .env
2) supabase start

Common:
- supabase status
- supabase stop

Layout:
- supabase/config/* — local config module
- supabase/migrations/* — SQL migrations


Link local to remote Supabase (ATH-359)
1) cd backend
2) supabase login
3) supabase link --project-ref hrvtfeupqubpyqyojtmc
4) Verify: supabase db list  # lists schemas on success
(Optional) To point the frontend at remote:
- Set VITE_SUPABASE_URL=https://hrvtfeupqubpyqyojtmc.supabase.co
- Set VITE_SUPABASE_ANON_KEY to the remote anon public key (Settings → API)