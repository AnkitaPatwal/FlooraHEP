import express from 'express';
import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { getAllModulesWithExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

if (!ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET is not set");
}

const supabaseAdmin = createClient(
  process.env.LOCAL_SUPABASE_URL || SUPABASE_URL,
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const router = express.Router();

// Cookie-based admin authentication middleware
function requireAdminCookie(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req as any).cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET!) as any;
    (req as any).admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const admin = (req as any).admin;
  if (!admin) {
    return res.status(401).json({ ok: false, error: "Missing admin context" });
  }

  if (admin.role !== "super_admin") {
    return res.status(403).json({ ok: false, error: "Super admin required" });
  }

  next();
}

/**
 * PUBLIC ROUTE
 * Accept invite and create admin account (no cookie required)
 */
router.post("/accept-invite", async (req, res) => {
  try {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing invite token" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "Password must be at least 8 characters",
      });
    }

    // Verify invite token
    let decoded: any;
    try {
      decoded = jwt.verify(token, ADMIN_JWT_SECRET!);
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: "Invalid or expired invite link",
      });
    }

    if (decoded.type !== "admin_invite" || !decoded.email) {
      return res.status(401).json({
        ok: false,
        error: "Invalid invite token",
      });
    }

    const email = String(decoded.email).toLowerCase().trim();

    // Check if admin already exists
    const { data: existingAdmin, error: existingError } = await supabaseAdmin
      .from("admin_users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("Supabase lookup error:", existingError);
      return res.status(500).json({ ok: false, error: "Database error" });
    }

    if (existingAdmin) {
      return res.status(409).json({
        ok: false,
        error: "Admin account already exists. Please log in.",
      });
    }

    // Hash password and create admin user
    const password_hash = await bcrypt.hash(password, 12);

    const { error: insertError } = await supabaseAdmin
      .from("admin_users")
      .insert({
        email,
        role: "admin",
        is_active: true,
        password_hash,
      });

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(500).json({
        ok: false,
        error: "Failed to create admin account",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Accept invite error:", err);
    return res.status(500).json({
      ok: false,
      error: "Something went wrong",
    });
  }
});

// PROTECTED ROUTES (everything below requires admin_token cookie)
router.use(requireAdminCookie);

/**
feature/ATH-253-admin-clients-list
 * ATH-253 List clients (admin only)
*/
router.get("/clients", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user')
      .select('user_id, fname, lname, email, status')
      .order('fname', { ascending: true });

    if (error) {
      console.error("Supabase error (list clients):", JSON.stringify(error, null, 2));
      return res.status(500).json({ message: "Error fetching clients", details: error });
    }

    const clients = (data ?? []).map((u: any) => ({
      id: u.user_id,
      name: `${u.fname ?? ''} ${u.lname ?? ''}`.trim(),
      email: u.email,
      status: u.status,
    }));

    return res.status(200).json({ clients });
  } catch (err) {
    console.error('Error fetching clients:', err);
    return res.status(500).json({ message: 'Error fetching clients' });
  }
});

/**
 * Approve a client (admin-only)
 */
router.post('/clients/:id/approve', async (req, res) => {
  const clientId = req.params.id;

  try {
    const response = await supabase
      .from('clients')
      .update({ status: 'approved' })
      .eq('id', clientId)
      .select();

    if (response.error) {
      console.error('Supabase error (approve):', response.error);
      throw response.error;
    }

    const client = response.data?.[0];
    if (!client) {
      console.warn(`No client found with ID ${clientId}`);
      return res.status(404).json({ message: 'Client not found' });
    }

    await sendApprovalEmail(client.email, client.name);
    res.status(200).json({ message: 'Client approved and email sent' });
  } catch (err) {
    console.error('Error approving client:', err);
    res.status(500).json({ message: 'Error approving client' });
  }
});

/**
 * Deny a client (admin-only)
 */
router.post('/clients/:id/deny', async (req, res) => {
  const clientId = req.params.id;

  try {
    const response = await supabase
      .from('clients')
      .update({ status: 'denied' })
      .eq('id', clientId)
      .select();

    if (response.error) {
      console.error('Supabase error (deny):', response.error);
      throw response.error;
    }

    const client = response.data?.[0];
    if (!client) {
      console.warn(`No client found with ID ${clientId}`);
      return res.status(404).json({ message: 'Client not found' });
    }

    await sendDenialEmail(client.email, client.name);
    res.status(200).json({ message: 'Client denied and email sent' });
  } catch (err) {
    console.error('Error denying client:', err);
    res.status(500).json({ message: 'Error denying client' });
  }
});

/**
 * Fetch all modules/plans with exercises (admin-only)
 */
router.get('/modules', async (req, res) => {
  try {
    const modules = await getAllModulesWithExercises(supabaseServer);
    return res.status(200).json(modules);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * Invite a new admin (super admin only)
 */
router.post("/invite", requireSuperAdmin, async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Valid email is required" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESET_FROM_EMAIL;
    const inviteBaseUrl = process.env.FRONTEND_ADMIN_INVITE_URL;

    if (!resendApiKey || !fromEmail || !inviteBaseUrl) {
      return res.status(500).json({ ok: false, error: "Email configuration missing" });
    }

    // Create signed invite token (24h expiry)
    const inviteToken = jwt.sign(
      {
        type: "admin_invite",
        email,
      },
      ADMIN_JWT_SECRET!,
      { expiresIn: "24h" }
    );

    const inviteUrl = `${inviteBaseUrl}?token=${encodeURIComponent(inviteToken)}`;

    const html = `
<div style="
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #1F2937;
  background-color: #FFFFFF;
  padding: 24px;
">

  <h2 style="
    margin: 0 0 12px 0;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
  ">
    You’ve been invited to Floora Admin
  </h2>

  <p style="margin: 0 0 12px 0;">
    A super admin invited you to create an admin account for Floora.
  </p>

  <p style="margin: 0 0 20px 0;">
    Click the button below to set your password and finish setting up your admin access.
    This link will expire in <strong>24 hours</strong>.
  </p>

  <a
    href="${inviteUrl}"
    style="
      display: inline-block;
      background-color: #2B8C8E;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
    "
  >
    Accept invite
  </a>

  <p style="
    margin: 20px 0 12px 0;
    font-size: 14px;
    color: #6B7280;
  ">
    If the button doesn’t work, copy and paste this link into your browser:
  </p>

  <p style="
    margin: 0 0 20px 0;
    font-size: 14px;
    word-break: break-all;
  ">
    <a href="${inviteUrl}" style="color: #2B8C8E;">
      ${inviteUrl}
    </a>
  </p>

  <hr style="
    border: none;
    border-top: 1px solid #E5E7EB;
    margin: 24px 0;
  " />

  <p style="
    margin: 0;
    font-size: 13px;
    color: #6B7280;
  ">
    If you weren’t expecting this invite, you can safely ignore this email.
    No account will be created unless you use the link above.
  </p>

</div>
    `.trim();

    const devTo = process.env.RESEND_DEV_TO_EMAIL;
    const toEmail = devTo || email;

    console.log("Invite email debug:", {
      emailEntered: email,
      RESEND_DEV_TO_EMAIL: process.env.RESEND_DEV_TO_EMAIL,
      toEmail,
      fromEmail,
    });

    const sendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: "You’re invited to Floora Admin",
        html,
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      console.error("Resend error:", errText);
      return res.status(502).json({ ok: false, error: "Email failed to send" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Admin invite error:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong" });
  }
});

export default router;