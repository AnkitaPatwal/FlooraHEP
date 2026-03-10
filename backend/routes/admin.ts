import express from 'express';
import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { getAllModulesWithExercises } from '../services/moduleService'
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
      if (error.code === '23505') return res.status(409).json({ error: 'A category with this name already exists.' });
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
      if (error.code === '23505') return res.status(409).json({ error: 'A category with this name already exists.' });
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
      created_by_admin_id: adminId
    };
    if (categoryId != null && categoryId !== '') {
      planRow.category_id = categoryId;
    }

    // Insert the plan
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

    // Insert plan_modules
    if (moduleIds.length > 0) {
      const planModules = moduleIds.map((moduleId, index) => ({
        plan_id: planId,
        module_id: moduleId,
        order_index: index + 1
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

    // Sort modules by order_index
    if (plan.plan_module && Array.isArray(plan.plan_module)) {
      plan.plan_module.sort((a: any, b: any) => a.order_index - b.order_index);
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
      updated_at: new Date().toISOString()
    };
    if (categoryId !== undefined) {
      updatePayload.category_id = categoryId === null || categoryId === '' ? null : categoryId;
    }

    // Update the plan
    const { error: planError } = await supabaseAdmin
      .from('plan')
      .update(updatePayload)
      .eq('plan_id', id);

    if (planError) {
      console.error('Error updating plan:', planError);
      return res.status(500).json({ error: 'Failed to update plan.' });
    }

    // Delete existing plan_modules
    const { error: deleteError } = await supabaseAdmin
      .from('plan_module')
      .delete()
      .eq('plan_id', id);

    if (deleteError) {
      console.error('Error deleting old modules:', deleteError);
      return res.status(500).json({ error: 'Failed to update plan modules.' });
    }

    // Insert new plan_modules
    if (moduleIds.length > 0) {
      const planModules = moduleIds.map((moduleId, index) => ({
        plan_id: id,
        module_id: moduleId,
        order_index: index + 1
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

    // plan_module rows will be deleted automatically due to ON DELETE CASCADE
    // defined in the database schema
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