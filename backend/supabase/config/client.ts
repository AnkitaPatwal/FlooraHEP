import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables explicitly from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

// Read Supabase config from environment variables
export const LOCAL_SUPABASE_URL =
  process.env.LOCAL_SUPABASE_URL ?? 'http://127.0.0.1:54321';

export const LOCAL_SUPABASE_ANON_KEY =
  process.env.LOCAL_SUPABASE_ANON_KEY ?? 'local-dev-key';

// Initialize and export Supabase client
export const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);

export function describeLocal() {
  return { url: LOCAL_SUPABASE_URL, anonKey: LOCAL_SUPABASE_ANON_KEY };
}
