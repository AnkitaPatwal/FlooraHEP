import { Request, Response, NextFunction } from "express";
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

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required in backend/.env");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in backend/.env");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    // Verify token with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid or expired token" });
    }

    const user = data.user;
    const role = user.user_metadata?.role ?? null;

    if (role !== "super_admin") {
      return res.status(403).json({ ok: false, error: "Forbidden: super_admin role required" });
    }

    (req as any).admin = {
      id: user.id,
      email: user.email ?? "",
      role,
      name: user.user_metadata?.name ?? null,
    };

    next();
  } catch (err) {
    console.error("Error in requireSuperAdmin:", err);
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}