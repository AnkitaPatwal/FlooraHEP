// providers/AuthProvider.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
}>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      const authInitMs = 15_000;
      let data: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"];
      let error: Awaited<ReturnType<typeof supabase.auth.getSession>>["error"];
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("auth_init_timeout")), authInitMs)
          ),
        ]);
        data = result.data;
        error = result.error;
      } catch {
        if (__DEV__) {
          console.warn("[AuthProvider] getSession timed out — check network / Supabase URL");
        }
        if (!cancelled) {
          setSession(null);
          setLoading(false);
          (global as any).userEmail = "";
        }
        return;
      }

      if (error) {
        const msg = error.message ?? "";
        const isRefreshFailure =
          msg.includes("Refresh Token") ||
          msg.includes("Invalid Refresh") ||
          msg.includes("refresh_token") ||
          (error as { code?: string }).code === "refresh_token_not_found";

        if (isRefreshFailure) {
          await supabase.auth.signOut({ scope: "local" });
          if (!cancelled) {
            setSession(null);
            setLoading(false);
            (global as any).userEmail = "";
          }
          return;
        }
      }

      if (cancelled) return;

      const s = data.session ?? null;
      setSession(s);
      setLoading(false);
      (global as any).userEmail = s?.user?.email ?? "";
    };

    void initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      (global as any).userEmail = newSession?.user?.email ?? "";
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
