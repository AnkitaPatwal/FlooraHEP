import express from 'express';
import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { getAllModulesWithExercises, createModule, saveModuleExercises } from '../services/moduleService'
import { supabaseServer } from '../lib/supabaseServer'
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

// Protect all routes with cookie-based auth
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
    const modules = await getAllModulesWithExercises(supabaseServer)
    return res.status(200).json(modules)
  } catch (error) {
    console.error('Failed to fetch modules:', error)
    return res.status(500).json({ error: 'Failed to fetch modules' })
  }
});

/**
 * ATH-413: Create a new module (admin-only)
 */
router.post('/modules', async (req, res) => {
  try {
    const admin = (req as any).admin
    if (!admin?.id) {
      return res.status(401).json({ error: 'Admin ID not found' })
    }
    const { title, description, session_number } = req.body
    const sessionNum = session_number != null ? Number(session_number) : 1
    const moduleRow = await createModule(supabaseServer, {
      title: title ?? '',
      description: description ?? '',
      session_number: Number.isInteger(sessionNum) && sessionNum > 0 ? sessionNum : 1,
      created_by_admin_id: String(admin.id),
    })
    return res.status(201).json(moduleRow)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create module'
    console.error('POST /api/admin/modules:', message)
    return res.status(400).json({ error: message })
  }
});

/**
 * ATH-413: Save module-to-exercise mapping (admin-only).
 * Body: { exercise_ids: number[] }
 */
router.put('/modules/:id/exercises', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid module id' })
    }
    const { exercise_ids } = req.body
    const ids = Array.isArray(exercise_ids)
      ? exercise_ids.map((x: unknown) => Number(x)).filter(Number.isInteger)
      : []
    const result = await saveModuleExercises(supabaseServer, id, ids)
    return res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save module exercises'
    console.error('PUT /api/admin/modules/:id/exercises:', message)
    return res.status(400).json({ error: message })
  }
});

export default router;
