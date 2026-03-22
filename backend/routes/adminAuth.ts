// backend/routes/adminAuth.ts
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/* -------------------- ENV -------------------- */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required in backend/.env");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in backend/.env");

/* -------------------- SUPABASE (SERVICE ROLE) -------------------- */

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* -------------------- TYPES -------------------- */

type AdminPayload = {
  id: string;
  email: string;
  role: string | null;
};

/* -------------------- HELPERS -------------------- */

/**
 * Extracts and verifies the Supabase Bearer token from the Authorization header.
 * Returns the admin payload if valid, null otherwise.
 */
async function getAdminFromToken(
  req: express.Request
): Promise<AdminPayload | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  // Verify the JWT with Supabase using the service role client
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  const user = data.user;
  const role = user.user_metadata?.role ?? null;

  return {
    id: user.id,
    email: user.email ?? "",
    role,
  };
}

/* -------------------- MIDDLEWARE -------------------- */

/**
 * Requires a valid Supabase session token.
 * Attaches admin payload to req.admin.
 */
export async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const admin = await getAdminFromToken(req);
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  (req as any).admin = admin;
  next();
}

/**
 * Requires super_admin role.
 * Must be used after requireAdmin.
 */
export async function requireSuperAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const admin = (req as any).admin as AdminPayload | undefined;
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  if (admin.role !== "super_admin") {
    return res
      .status(403)
      .json({ message: "Unauthorized: Super admin access required." });
  }

  next();
}

/* -------------------- ROUTES -------------------- */

/**
 * GET /api/admin/me
 * Returns the current admin's info from Supabase Auth.
 * Frontend sends: Authorization: Bearer <supabase_access_token>
 */
router.get("/me", async (req, res) => {
  const admin = await getAdminFromToken(req);
  if (!admin)
    return res.status(401).json({ message: "Unauthorized: Please log in." });

  return res.status(200).json({ ok: true, admin });
});

export default router;