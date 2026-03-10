import express from 'express';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';

import { getAllModulesWithExercises, createModule, saveModuleExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';
import { uploadExerciseVideo, linkVideoToExercise } from '../services/videoService';

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
  throw new Error('SUPABASE_URL is not set');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET is not set');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const router = express.Router();

// Cookie-based admin authentication middleware
function requireAdminCookie(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req as any).cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET!) as any;
    (req as any).admin = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
}

// Protect all routes with cookie-based auth
router.use(requireAdminCookie);

/**
 * ATH-253 List clients (admin only)
 */
router.get('/clients', async (_req, res) => {
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['video/mp4', 'video/quicktime'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.mp4', '.mov'];

    if (!allowedMime.includes(file.mimetype) || !allowedExt.includes(ext)) {
      return cb(new Error('Only .mp4 and .mov video files are allowed.'));
    }

    cb(null, true);
  },
});

router.post('/exercises/:exerciseId/video', upload.single('file'), async (req, res) => {
  try {
    const exerciseId = Number(req.params.exerciseId);
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      return res.status(400).json({ message: 'Invalid exerciseId' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Missing file' });
    }

    // take uploader id from header for local testing
    const uploaderHeader = req.header('x-uploader-user-id');
    const uploaderUserId = Number(uploaderHeader ?? 0);

    if (!Number.isInteger(uploaderUserId) || uploaderUserId <= 0) {
      return res.status(400).json({
        message: 'Missing/invalid x-uploader-user-id header (must be an existing bigint user_id)',
      });
    }

    const { video_id, publicUrl } = await uploadExerciseVideo(
      supabaseServer,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      uploaderUserId
    );

    await linkVideoToExercise(supabaseServer, exerciseId, video_id);

    return res.status(200).json({ ok: true, video_id, publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return res.status(500).json({ message: msg });
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
 * ATH-413: Create a new module (admin-only)
 */
router.post('/modules', async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (!admin?.id) {
      return res.status(401).json({ error: 'Admin ID not found' });
    }

    const { title, description, session_number } = req.body;
    const sessionNum = session_number != null ? Number(session_number) : 1;

    const moduleRow = await createModule(supabaseServer, {
      title: title ?? '',
      description: description ?? '',
      session_number: Number.isInteger(sessionNum) && sessionNum > 0 ? sessionNum : 1,
      created_by_admin_id: String(admin.id),
    });

    return res.status(201).json(moduleRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create module';
    console.error('POST /api/admin/modules:', message);
    return res.status(400).json({ error: message });
  }
});

/**
 * ATH-413: Save module-to-exercise mapping (admin-only)
 * Body: { exercise_ids: number[] }
 */
router.put('/modules/:id/exercises', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid module id' });
    }

    const { exercise_ids } = req.body;
    const ids = Array.isArray(exercise_ids)
      ? exercise_ids.map((x: unknown) => Number(x)).filter(Number.isInteger)
      : [];

    const result = await saveModuleExercises(supabaseServer, id, ids);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save module exercises';
    console.error('PUT /api/admin/modules/:id/exercises:', message);
    return res.status(400).json({ error: message });
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

    return res.status(500).json({ message: 'Error denying client' })
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