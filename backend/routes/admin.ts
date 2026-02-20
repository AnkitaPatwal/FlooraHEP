import express from 'express';
import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { requireAdmin } from '../lib/adminGuard';
import { getAllModulesWithExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';

const router = express.Router();

// Protect everything below
router.use(requireAdmin);

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
router.get('/modules', requireAdmin, async (_req, res) => {
  try {
    const modules = await getAllModulesWithExercises(supabaseServer);
    return res.status(200).json(modules);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return res.status(500).json({ error: 'Failed to fetch modules' });
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

    // requireAdmin sets req.user (see adminGuard.ts) -> use admin email to resolve user_id
    const adminEmail = (req as any).user?.email?.toLowerCase().trim();
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
    if (!userId) return res.status(400).json({ error: 'userId is required' });

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

export default router;
