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
      const { data, error } = await supabase.auth.getSession();

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
