import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

export interface AdminJwtPayload {
  id: string;
  email: string;
  role: string | null;
  name?: string | null;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required in backend/.env");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in backend/.env");
}
if (!ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET is required in backend/.env");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Read token from cookie (not Authorization header)
  const token = (req as any).cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
  if (!ADMIN_JWT_SECRET) {
    console.error("ADMIN_JWT_SECRET is not set");
    return res.status(500).json({ ok: false, error: "Server configuration error" });
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;

    // Verify role from database (not just token claim)
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, role, is_active")
      .eq("id", payload.id)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ ok: false, error: "Invalid or expired token" });
    }

    if (!data.is_active) {
      return res.status(403).json({ ok: false, error: "Admin account is disabled" });
    }

    if (data.role !== "super_admin") {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: super_admin role required",
      });
    }

    (req as any).admin = payload;
    next();
  } catch (err) {
    console.error("Error in requireSuperAdmin:", err);
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}
