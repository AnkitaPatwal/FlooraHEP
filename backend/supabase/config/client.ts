export const LOCAL_SUPABASE_URL =
  process.env.LOCAL_SUPABASE_URL ?? "http://localhost:54321";

export const LOCAL_SUPABASE_ANON_KEY =
  process.env.LOCAL_SUPABASE_ANON_KEY ?? "local-dev-key";

export function describeLocal() {
  return { url: LOCAL_SUPABASE_URL, anonKey: LOCAL_SUPABASE_ANON_KEY };
}