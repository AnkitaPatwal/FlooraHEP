import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

/**
 * Renders children only when role === "super_admin" (from DB via /api/admin/me).
 * For non-super_admin, silently redirects to fallbackTo. No toast/message.
 * fallbackTo can be a string or a function (params) => string for dynamic routes.
 */
export function SuperAdminRoute({
  fallbackTo,
  children,
}: {
  fallbackTo: string | ((params: Record<string, string | undefined>) => string);
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const params = useParams();
  const { admin, loading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!admin) {
      navigate("/admin-login", { replace: true });
      return;
    }
    const role = String(admin.role ?? "").trim().toLowerCase();
    if (role !== "super_admin") {
      const target = typeof fallbackTo === "function" ? fallbackTo(params) : fallbackTo;
      navigate(target, { replace: true });
    }
  }, [admin, isAuthLoading, navigate, fallbackTo, params.id]);

  const role = admin ? String(admin.role ?? "").trim().toLowerCase() : "";
  if (isAuthLoading || !admin || role !== "super_admin") {
    return null;
  }

  return <>{children}</>;
}
