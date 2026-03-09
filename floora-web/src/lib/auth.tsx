// Auth utilities for admin users

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AdminUser {
  id: string;
  email: string;
  role?: string | null;
  name?: string | null;
}

/**
 * Get current admin user from session storage
 */
export function getAdminUser(): AdminUser | null {
  try {
    const stored = sessionStorage.getItem("adminUser");
    if (!stored) return null;
    return JSON.parse(stored) as AdminUser;
  } catch {
    return null;
  }
}

/**
 * Store admin user in session storage
 */
export function setAdminUser(user: AdminUser): void {
  sessionStorage.setItem("adminUser", JSON.stringify(user));
  (window as any).__adminUser = user;
}

/**
 * Check if current user is super admin (role from DB via /api/admin/me).
 * Normalizes role to handle casing/whitespace.
 */
export function isSuperAdmin(): boolean {
  const user = getAdminUser();
  const role = String(user?.role ?? "").trim().toLowerCase();
  return role === "super_admin";
}

/**
 * Check if user is authenticated (any admin role)
 */
export function isAuthenticated(): boolean {
  return getAdminUser() !== null;
}

/**
 * Clear admin session
 */
export function clearAdminSession(): void {
  sessionStorage.removeItem("adminUser");
  delete (window as any).__adminUser;
}

/**
 * Refresh admin user from backend
 */
export async function refreshAdminUser(): Promise<AdminUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/admin/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) clearAdminSession();
      return getAdminUser();
    }

    const data = await res.json();
    if (data?.ok && data?.admin) {
      setAdminUser(data.admin);
      return data.admin;
    }

    return getAdminUser();
  } catch {
    return getAdminUser();
  }
}

/* -------------------- React Context -------------------- */

type AuthContextValue = {
  admin: AdminUser | null;
  isSuperAdmin: boolean;
  loading: boolean;
  /** True until auth/role is loaded from backend. Gate protected UI on !loading. */
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
  const [admin, setAdmin] = useState<AdminUser | null>(() => getAdminUser());
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const a = await refreshAdminUser();
    setAdmin(a ?? getAdminUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const role = String(admin?.role ?? "").trim().toLowerCase();
  const isSuperAdmin = role === "super_admin";

  return (
    <AuthContext.Provider value={{ admin, isSuperAdmin, loading, isAuthLoading: loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
