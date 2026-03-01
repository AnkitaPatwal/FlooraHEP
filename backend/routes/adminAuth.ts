import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

/* -------------------- ENV -------------------- */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? "";

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required in backend/.env");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in backend/.env");
}

if (!ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET is required in backend/.env");
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/* -------------------- HELPERS -------------------- */

function setAdminCookie(res: express.Response, token: string) {
  res.cookie("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function verifyAdminCookie(req: express.Request, res: express.Response) {
  const token = (req as any).cookies?.admin_token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }

    return decoded as {
      adminId: string | number;
      email: string;
      role?: string | null;
      name?: string | null;
    };
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
}

/* -------------------- ROUTES -------------------- */

/**
 * GET /api/admin/me
 * Reads cookie → fetches latest admin from DB
 */
router.get("/me", async (req, res) => {
  const payload = verifyAdminCookie(req, res);
  if (!payload) return;

  let response = await supabaseAdmin
    .from("admin_users")
    .select("id, email, role, name, is_active")
    .eq("id", payload.adminId)
    .maybeSingle();

  // If name column doesn't exist, retry without it
  if (response.error?.code === "42703") {
    response = await supabaseAdmin
      .from("admin_users")
      .select("id, email, role, is_active")
      .eq("id", payload.adminId)
      .maybeSingle();
  }

  if (response.error || !response.data) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!response.data.is_active) {
    return res.status(403).json({ message: "Admin account is disabled." });
  }

  return res.json({
    ok: true,
    admin: response.data,
  });
});

/**
 * POST /api/admin/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  let response = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, is_active, role, name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  // Retry if name column missing
  if (response.error?.code === "42703") {
    response = await supabaseAdmin
      .from("admin_users")
      .select("id, email, password_hash, is_active, role")
      .ilike("email", normalizedEmail)
      .maybeSingle();
  }

  if (response.error || !response.data) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const adminUser = response.data;

  if (!adminUser.is_active) {
    return res.status(403).json({ message: "Admin account is disabled." });
  }

  const ok = await bcrypt.compare(password, adminUser.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign(
    {
      adminId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role ?? null,
      name: (adminUser as any).name ?? null,
    },
    ADMIN_JWT_SECRET,
    { expiresIn: "7d" }
  );

  setAdminCookie(res, token);

  return res.status(200).json({
    ok: true,
    admin: {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role ?? null,
      name: (adminUser as any).name ?? null,
    },
  });
});

/**
 * POST /api/admin/assign-admin-role
 * Super-admin only
 */
router.post("/assign-admin-role", async (req, res) => {
  const payload = verifyAdminCookie(req, res);
  if (!payload) return;

  if (payload.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { email, name } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName =
    typeof name === "string" && name.trim() ? name.trim() : null;

  const updatePayload: any = { role: "admin" };
  if (trimmedName) updatePayload.name = trimmedName;

  let update = await supabaseAdmin
    .from("admin_users")
    .update(updatePayload)
    .ilike("email", normalizedEmail)
    .select("id, email, role");

  if (update.error?.code === "42703") {
    update = await supabaseAdmin
      .from("admin_users")
      .update({ role: "admin" })
      .ilike("email", normalizedEmail)
      .select("id, email, role");
  }

  if (update.error) {
    return res.status(500).json({ message: "Backend failure." });
  }

  if (!update.data?.length) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({
    ok: true,
    admin: update.data[0],
  });
});

export default router;