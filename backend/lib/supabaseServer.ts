import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    'supabaseUrl is required. Set NEXT_PUBLIC_SUPABASE_URL or LOCAL_SUPABASE_URL in backend/.env'
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is required. Set SUPABASE_SERVICE_ROLE_KEY or LOCAL_SUPABASE_SERVICE_ROLE_KEY in backend/.env'
  );
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});