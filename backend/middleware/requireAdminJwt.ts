import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

export interface AdminJwtPayload {
  id: string;
  email?: string;
  role?: string;
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.LOCAL_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

export async function requireAdminJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = String(req.header("Authorization") || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid or expired token" });
    }
    (req as any).admin = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role ?? null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}