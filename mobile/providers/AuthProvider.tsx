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
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const s = data.session ?? null;
        setSession(s);
        setLoading(false);
        (global as any).userEmail = s?.user?.email ?? "";
      })
      .catch(() => {
        // Invalid refresh token / no session (first load, logged out) – treat as unauthenticated
        setSession(null);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      (global as any).userEmail = newSession?.user?.email ?? "";
    });

    return () => listener.subscription.unsubscribe();
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
