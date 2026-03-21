import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { getAllModulesWithExercises, createModule, saveModuleExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAdminCookie } from '../middleware/requireAdminCookie';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET is not set');
}

const supabaseAdmin = createClient(
  process.env.LOCAL_SUPABASE_URL || SUPABASE_URL,
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const router = express.Router();

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
 * ATH-253 List clients (admin only)
 */
router.get("/clients", async (_req, res) => {

  try {
    const { data, error } = await supabaseAdmin
      .from('user')
      .select('user_id, fname, lname, email, status')
      .order('fname', { ascending: true });

    if (error) {
      console.error('Supabase error (list clients):', JSON.stringify(error, null, 2));
      return res.status(500).json({ message: 'Error fetching clients', details: error });
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
    return res.status(200).json({ message: 'Client approved and email sent' });
  } catch (err) {
    console.error('Error approving client:', err);
    return res.status(500).json({ message: 'Error approving client' });
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
    return res.status(200).json({ message: 'Client denied and email sent' });
  } catch (err) {
    console.error('Error denying client:', err);
    return res.status(500).json({ message: 'Error denying client' });
  }
});

/**
 * Fetch all modules/plans with exercises (admin-only)
 */
router.get('/modules', async (_req, res) => {
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

/**

 * ATH-254: Assign a module/plan to a client (admin-only)
 * POST /api/admin/clients/:userId/modules
 * Body: { module_id: number, available_at?: string, notes?: string }
 */
router.post('/clients/:userId/modules', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { module_id, available_at, notes } = req.body ?? {};

    if (!userId || !module_id) {
      return res.status(400).json({ error: 'userId and module_id are required' });
    }

    const adminEmail = ((req as any).admin?.email as string | undefined)?.toLowerCase().trim();
    if (!adminEmail) {
      return res.status(401).json({ error: 'Missing admin email context' });
    }

    const { data: adminUser, error: adminErr } = await supabaseServer
      .from('user')
      .select('user_id')
      .eq('email', adminEmail)
      .maybeSingle();

    if (adminErr || !adminUser?.user_id) {
      console.error('Admin lookup failed:', adminErr);
      return res.status(403).json({ error: 'Admin not found in user table' });
    }

    const adminUserId = adminUser.user_id;

    const { data, error } = await supabaseServer
      .from('user_module')
      .insert({
        user_id: userId,
        module_id: Number(module_id),
        assigned_by_admin_id: adminUserId,
        available_at: available_at ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning module:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('Failed to assign module:', err);
    return res.status(500).json({ error: 'Failed to assign module' });
  }
});

/**
 * ATH-254: Retrieve assigned modules for a client (admin-only)
 * GET /api/admin/clients/:userId/modules
 */
router.get('/clients/:userId/modules', async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabaseServer
      .from('user_module')
      .select(`
        user_module_id,
        user_id,
        module_id,
        assigned_by_admin_id,
        assigned_at,
        available_at,
        notes,
        module ( module_id, title )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Failed to fetch assignments:', err);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

/**
 * ATH-413: Create a new module (admin-only)

 * Fetch all modules/plans with exercises (admin-only)
 */
router.get('/modules', async (req, res) => {
  try {
    const modules = await getAllModulesWithExercises(supabaseServer)
    return res.status(200).json(modules)
  } catch (error) {
    console.error('Failed to fetch modules:', error)
    return res.status(500).json({ error: 'Failed to fetch modules' })
  }
});

/**
 * List all plan categories (admin-only). No seed data; admins create names.
 */
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('plan_category')
      .select('category_id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    return res.status(200).json(data ?? []);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Create a plan category (admin-only)
 */
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('plan_category')
      .insert({ name: name.trim() })
      .select('category_id, name')
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        return res.status(409).json({ error: 'A category with this name already exists.' });
      }
      console.error('Error creating category:', error);
      return res.status(500).json({ error: 'Failed to create category.' });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create category:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Update a plan category (admin-only)
 */
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const { error } = await supabaseAdmin
      .from('plan_category')
      .update({ name: name.trim() })
      .eq('category_id', id);

    if (error) {
      if ((error as any).code === '23505') {
        return res.status(409).json({ error: 'A category with this name already exists.' });
      }
      console.error('Error updating category:', error);
      return res.status(500).json({ error: 'Failed to update category.' });
    }

    return res.status(200).json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Failed to update category:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Delete a plan category (admin-only). Plans using it will have category_id set to null.
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('plan_category')
      .delete()
      .eq('category_id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category.' });
    }

    return res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Fetch all plans (admin-only)
 */
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('plan')
      .select(`
        plan_id,
        title,
        description,
        category_id,
        plan_category (
          category_id,
          name
        ),
        plan_module (
          module_id
        )
      `)
      .order('plan_id', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }

    return res.status(200).json(plans);
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Create a new plan (admin-only)
 */
router.post('/plans', async (req, res) => {
  try {
    const adminId = (req as any).admin?.id;
    const { title, description, moduleIds, categoryId } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Description is required.' });
    }

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ error: 'moduleIds must be an array.' });
    }

    const planRow: any = {
      title,
      description,
      created_by_admin_id: adminId,
    };
    if (categoryId != null && categoryId !== '') {
      planRow.category_id = categoryId;
    }

    const { data: planData, error: planError } = await supabaseAdmin
      .from('plan')
      .insert(planRow)
      .select('plan_id')
      .single();

    if (planError || !planData) {
      console.error('Error creating plan:', planError);
      return res.status(500).json({ error: 'Failed to create plan.' });
    }

    const planId = planData.plan_id;

    if (moduleIds.length > 0) {
      const planModules = moduleIds.map((moduleId: number, index: number) => ({
        plan_id: planId,
        module_id: moduleId,
        order_index: index + 1,
      }));

      const { error: modulesError } = await supabaseAdmin
        .from('plan_module')
        .insert(planModules);

      if (modulesError) {
        console.error('Error linking modules to plan:', modulesError);
        return res.status(500).json({ error: 'Failed to link modules to plan.' });
      }
    }

    return res.status(201).json({ message: 'Plan created successfully.', planId });
  } catch (error) {
    console.error('Failed to create plan:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Get a specific plan by ID (admin-only)
 */
router.get('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plan')
      .select(`
        plan_id,
        title,
        description,
        category_id,
        plan_category (
          category_id,
          name
        ),
        plan_module (
          order_index,
          module_id,
          module (
            module_id,
            title,
            description,
            session_number
          )
        )
      `)
      .eq('plan_id', id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    if ((plan as any).plan_module && Array.isArray((plan as any).plan_module)) {
      (plan as any).plan_module.sort(
        (a: any, b: any) => a.order_index - b.order_index
      );
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error('Failed to fetch plan:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Update an existing plan (admin-only)
 */
router.put('/plans/:id', async (req, res) => {
  try {
    const adminId = (req as any).admin?.id;
    const { id } = req.params;
    const { title, description, moduleIds, categoryId } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Description is required.' });
    }

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ error: 'moduleIds must be an array.' });
    }

    const updatePayload: any = {
      title,
      description,
      updated_at: new Date().toISOString(),
    };
    if (categoryId !== undefined) {
      updatePayload.category_id =
        categoryId === null || categoryId === '' ? null : categoryId;
    }

    const { error: planError } = await supabaseAdmin
      .from('plan')
      .update(updatePayload)
      .eq('plan_id', id);

    if (planError) {
      console.error('Error updating plan:', planError);
      return res.status(500).json({ error: 'Failed to update plan.' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('plan_module')
      .delete()
      .eq('plan_id', id);

    if (deleteError) {
      console.error('Error deleting old modules:', deleteError);
      return res.status(500).json({ error: 'Failed to update plan modules.' });
    }

    if (moduleIds.length > 0) {
      const planModules = moduleIds.map((moduleId: number, index: number) => ({
        plan_id: id,
        module_id: moduleId,
        order_index: index + 1,
      }));

      const { error: modulesError } = await supabaseAdmin
        .from('plan_module')
        .insert(planModules);

      if (modulesError) {
        console.error('Error linking modules to plan:', modulesError);
        return res.status(500).json({ error: 'Failed to link new modules to plan.' });
      }
    }

    return res.status(200).json({ message: 'Plan updated successfully.' });
  } catch (error) {
    console.error('Failed to update plan:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Delete a plan (admin-only)
 */
router.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: deleteError } = await supabaseAdmin
      .from('plan')
      .delete()
      .eq('plan_id', id);

    if (deleteError) {
      console.error('Error deleting plan:', deleteError);
      return res.status(500).json({ error: 'Failed to delete plan.' });
    }

    return res.status(200).json({ message: 'Plan deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


export default router;

