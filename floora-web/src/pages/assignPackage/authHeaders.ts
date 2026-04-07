import { supabase } from "../../lib/supabase-client";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}
