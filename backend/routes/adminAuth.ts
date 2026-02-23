import express from "express";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const router = express.Router();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LOCAL_SUPABASE_URL;

console.log("Backend SUPABASE_URL:", SUPABASE_URL);

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "supabaseUrl is required. Set NEXT_PUBLIC_SUPABASE_URL or LOCAL_SUPABASE_URL in backend/.env"
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required. Set SUPABASE_SERVICE_ROLE_KEY (or LOCAL_SUPABASE_SERVICE_ROLE_KEY) in backend/.env"
  );
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

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: adminUser, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, password_hash, is_active")
      .ilike("email", normalizedEmail) // case-insensitive match
      .maybeSingle();

    if (error) {
      console.error("supabase error:", error);
      return res.status(500).json({ message: "Login failed." });
    }

    if (!adminUser) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

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
});

export default router;