// backend/routes/admin.ts
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

// Service role client (backend only) to read admin_users.password_hash
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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
      .select("id, email, password_hash, is_active")
      .ilike("email", normalizedEmail) // case-insensitive match
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

    // success (for now)
    return res.status(200).json({
      ok: true,
      admin: { id: adminUser.id, email: adminUser.email },
    });
  } catch (err) {
    console.error("admin login error:", err);
    return res.status(500).json({ message: "Login failed." });
  }

  return res.status(200).json({
    ok: true,
    admin: update.data[0],
  });
});

export default router;