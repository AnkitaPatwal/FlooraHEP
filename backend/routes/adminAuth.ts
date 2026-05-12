// backend/routes/adminAuth.ts
import { randomUUID } from "crypto";
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

/** Selected `admin_users` row shape (not `typeof adminRow` — that narrows to `null` inside `if (!adminRow)`). */
type AdminUsersRow = {
  id: string;
  email: string;
  role: string | null;
  is_active: boolean;
};

function mergeAdminRole(
  dbRole: string | null | undefined,
  metadataRole: string | null | undefined
): string | null {
  if (dbRole === "super_admin" || metadataRole === "super_admin") {
    return "super_admin";
  }
  if (dbRole === "admin" || metadataRole === "admin") {
    return "admin";
  }
  return dbRole ?? metadataRole ?? null;
}

/* -------------------- HELPERS -------------------- */

/**
 * Extracts and verifies the Supabase Bearer token from the Authorization header.
 * Returns the admin payload if valid, null otherwise.
 *
 * `id` is always `public.admin_users.id` (UUID). That column is the FK target for
 * `plan.created_by_admin_id` / `module.created_by_admin_id`. Invited admins get a row
 * provisioned on first API call (id aligned with `auth.users.id`).
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
  const email = user.email?.toLowerCase().trim();
  if (!email) return null;

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role
      : null;

  const { data: row, error: rowError } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, role, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (rowError) {
    console.error("admin_users lookup in getAdminFromToken:", rowError);
    return null;
  }

  let adminRow = row as AdminUsersRow | null;

  if (!adminRow) {
    const canProvision =
      metadataRole === "admin" || metadataRole === "super_admin";
    if (!canProvision) {
      return null;
    }

    const insertRole = metadataRole === "super_admin" ? "super_admin" : "admin";

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("admin_users")
      .insert({
        id: user.id,
        email,
        password_hash: `temp-${randomUUID()}`,
        role: insertRole,
        is_active: true,
      })
      .select("id, email, role, is_active")
      .maybeSingle();

    if (insertError) {
      const code = (insertError as { code?: string }).code;
      if (code === "23505") {
        const { data: again, error: againErr } = await supabaseAdmin
          .from("admin_users")
          .select("id, email, role, is_active")
          .ilike("email", email)
          .maybeSingle();
        if (againErr || !again) {
          console.error("admin_users re-fetch after duplicate:", againErr);
          return null;
        }
        adminRow = again as AdminUsersRow;
      } else {
        console.error("admin_users insert in getAdminFromToken:", insertError);
        return null;
      }
    } else if (!inserted) {
      console.error("admin_users insert returned no row");
      return null;
    } else {
      adminRow = inserted as AdminUsersRow;
    }
  }

  if (!adminRow?.is_active) {
    return null;
  }

  const role = mergeAdminRole(adminRow.role, metadataRole);
  if (role !== "admin" && role !== "super_admin") {
    return null;
  }

  return {
    id: adminRow.id,
    email: adminRow.email ?? email,
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