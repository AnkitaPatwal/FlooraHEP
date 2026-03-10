// backend/routes/adminAuth.ts
import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ensureAdminProfileForInvite } from "../lib/adminUsers";

const router = express.Router();

/* -------------------- ENV -------------------- */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? "";

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required in backend/.env");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in backend/.env");
if (!ADMIN_JWT_SECRET)
  throw new Error("ADMIN_JWT_SECRET is required in backend/.env");

/* -------------------- SUPABASE (SERVICE ROLE) -------------------- */

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* -------------------- TYPES -------------------- */

type JwtAdminPayload = {
  id: string | number;
  email: string;
  role: string | null;
  name: string | null;
};

/* -------------------- HELPERS -------------------- */

function setAdminCookie(res: express.Response, token: string) {
  res.cookie("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAdminCookie(res: express.Response) {
  res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });
}

function readAdminFromCookie(req: express.Request): JwtAdminPayload | null {
  const token = (req as any).cookies?.admin_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as JwtAdminPayload;
    if (!decoded?.email) return null;
    return decoded;
  } catch {
    return null;
  }
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const admin = readAdminFromCookie(req);
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });
  (req as any).admin = admin;
  next();
}

/**
 *   Always load the latest admin row from DB (prevents stale role in cookie)
 */
async function fetchAdminFromDb(admin: JwtAdminPayload) {
  // Prefer id (uuid) if present
  const id = admin?.id;

  let query = supabaseAdmin
    .from("admin_users")
    .select("id, email, role, is_active, name");

  if (typeof id === "string" && id.length > 0) {
    query = query.eq("id", id);
  } else {
    // fallback by email (case-insensitive)
    query = query.ilike("email", admin.email);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data;
}

async function requireSuperAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const admin = (req as any).admin as JwtAdminPayload | undefined;
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  // check role from DB (not from cookie)
  const dbAdmin = await fetchAdminFromDb(admin);
  if (!dbAdmin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  if (!dbAdmin.is_active) {
    return res.status(403).json({ message: "Admin account is disabled." });
  }

  if (dbAdmin.role !== "super_admin") {
    return res
      .status(403)
      .json({ message: "Unauthorized: You do not have access to this page." });
  }

  next();
}

/* -------------------- ROUTES -------------------- */

/**
 * POST /api/admin/login
 * body: { email, password }
 * sets admin_token cookie
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, password_hash, is_active, role, name")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error || !data) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!data.is_active) {
      return res.status(403).json({ message: "Admin account is disabled." });
    }

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const payload: JwtAdminPayload = {
      id: data.id,
      email: data.email,
      role: data.role ?? null,
      name: (data as any).name ?? null,
    };

    const token = jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: "7d" });
    setAdminCookie(res, token);

    return res.status(200).json({ ok: true, admin: payload });
  } catch (err) {
    console.error("admin login error:", err);
    return res.status(500).json({ message: "Login failed." });
  }
});

/**
 * POST /api/admin/logout
 */
router.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  return res.status(200).json({ ok: true });
});

/**
 * GET /api/admin/me
 *  return fresh admin from DB (not stale cookie role)
 */
router.get("/me", async (req, res) => {
  const admin = readAdminFromCookie(req);
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  const dbAdmin = await fetchAdminFromDb(admin);
  if (!dbAdmin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  if (!dbAdmin.is_active) {
    return res.status(403).json({ message: "Admin account is disabled." });
  }

  const fresh: JwtAdminPayload = {
    id: dbAdmin.id,
    email: dbAdmin.email,
    role: dbAdmin.role ?? null,
    name: (dbAdmin as any).name ?? null,
  };

  return res.status(200).json({ ok: true, admin: fresh });
});

/**
 * POST /api/admin/assign-admin-role
 * super_admin only
 * body: { email, name? }
 */
router.post(
  "/assign-admin-role",
  requireAdmin,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { email, name } = req.body ?? {};

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email is required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const cleanedName =
        typeof name === "string" && name.trim().length > 0 ? name.trim() : null;

      // Update role -> admin, optionally set name (don’t overwrite with null unless provided)
      const updatePayload: Record<string, any> = { role: "admin" };
      if (cleanedName !== null) updatePayload.name = cleanedName;

      const { data, error } = await supabaseAdmin
        .from("admin_users")
        .update(updatePayload)
        .ilike("email", normalizedEmail)
        .select("id, email, role, name")
        .maybeSingle();

      if (error || !data) {
        return res
          .status(500)
          .json({ message: "Backend failure. Please try again." });
      }

      return res.status(200).json({ ok: true, admin: data });
    } catch (err) {
      console.error("assign-admin-role error:", err);
      return res
        .status(500)
        .json({ message: "Backend failure. Please try again." });
    }
  }
);

/**
 * POST /api/admin/invite-profile
 * super_admin only
 * body: { email, name? }
 *
 * Ensures an admin_users record exists for the invited email
 * with role=admin, status=approved, is_active=true.
 */
router.post(
  "/invite-profile",
  requireAdmin,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { email, name } = req.body ?? {};

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email is required." });
      }

      const admin = await ensureAdminProfileForInvite({ email, name });

      return res.status(200).json({ ok: true, admin });
    } catch (err) {
      console.error("invite-profile error:", err);
      return res.status(500).json({
        ok: false,
        message: "Failed to create/update admin profile.",
      });
    }
  }
);

export default router;