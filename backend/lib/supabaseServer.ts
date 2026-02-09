import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('supabaseUrl is required. Set NEXT_PUBLIC_SUPABASE_URL or LOCAL_SUPABASE_URL in backend/.env');
}

if (!SUPABASE_KEY) {
  throw new Error('supabaseKey is required. Set SUPABASE_SERVICE_ROLE_KEY or LOCAL_SUPABASE_ANON_KEY in backend/.env');
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
