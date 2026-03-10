import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

/**
 * Renders children only when the user is authenticated as any admin (admin or super_admin).
 * If not authenticated, redirects to /admin-login.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { admin, loading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!admin) {
      navigate("/admin-login", { replace: true });
    }
  }, [admin, isAuthLoading, navigate]);

  if (isAuthLoading || !admin) {
    return null;
  }

  return <>{children}</>;
}
