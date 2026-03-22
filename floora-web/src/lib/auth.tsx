// Auth utilities for admin users
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";

export interface AdminUser {
  id: string;
  email: string;
  role?: string | null;
  name?: string | null;
}

/**
 * Get current admin user from Supabase session
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const user = session.user;
  return {
    id: user.id,
    email: user.email ?? "",
    role: user.user_metadata?.role ?? null,
    name: user.user_metadata?.name ?? null,
  };
}

/**
 * Check if current user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getAdminUser();
  const role = String(user?.role ?? "").trim().toLowerCase();
  return role === "super_admin";
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

/**
 * Clear admin session via Supabase signOut
 */
export async function clearAdminSession(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Refresh admin user from Supabase session
 */
export async function refreshAdminUser(): Promise<AdminUser | null> {
  return await getAdminUser();
}

/* -------------------- React Context -------------------- */

type AuthContextValue = {
  admin: AdminUser | null;
  isSuperAdmin: boolean;
  loading: boolean;
  isAuthLoading: boolean;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  admin: null,
  isSuperAdmin: false,
  loading: true,
  isAuthLoading: true,
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const a = await getAdminUser();
    setAdmin(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load
    refreshAuth();

    // Keep auth state in sync (handles refresh, tab focus, signOut, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setAdmin(null);
      } else {
        setAdmin({
          id: session.user.id,
          email: session.user.email ?? "",
          role: session.user.user_metadata?.role ?? null,
          name: session.user.user_metadata?.name ?? null,
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refreshAuth]);

  const role = String(admin?.role ?? "").trim().toLowerCase();
  const superAdmin = role === "super_admin";

  return (
    <AuthContext.Provider value={{ admin, isSuperAdmin: superAdmin, loading, isAuthLoading: loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}