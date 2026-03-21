import { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "../lib/supabaseServer";

export type AdminAuthedRequest = Request & {
  user?: User;
  accessToken?: string;
  adminUser?: {
    id: string;
    email: string;
    role: string;
    is_active?: boolean;
    name?: string | null;
  };
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

export async function requireAdminJwt(
  req: AdminAuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing authorization token",
      });
    }

    // Validate Supabase JWT and get authenticated user
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid or expired token",
      });
    }

    const user = data.user;
    const email = user.email?.toLowerCase().trim();

    if (!email) {
      return res.status(401).json({
        ok: false,
        error: "Invalid token payload",
      });
    }

    // Link authenticated user to admin_users table
    const { data: adminUser, error: adminError } = await supabaseServer
      .from("admin_users")
      .select("id, email, role, is_active, name")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("admin_users lookup error:", adminError);
      return res.status(403).json({
        ok: false,
        error: "Forbidden",
      });
    }

    if (!adminUser) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden",
      });
    }

    if (!adminUser.is_active) {
      return res.status(403).json({
        ok: false,
        error: "Admin account is disabled",
      });
    }

    if (adminUser.role !== "admin" && adminUser.role !== "super_admin") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden",
      });
    }

    req.user = user;
    req.accessToken = token;
    req.adminUser = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      is_active: adminUser.is_active,
      name: adminUser.name ?? null,
    };

    return next();
  } catch (err) {
    console.error("requireAdminJwt error:", err);
    return res.status(401).json({
      ok: false,
      error: "Invalid or expired token",
    });
  }
}