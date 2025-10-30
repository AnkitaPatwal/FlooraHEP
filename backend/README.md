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