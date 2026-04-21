import express from 'express';
import { createClient } from '@supabase/supabase-js';

import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { logDashboardActivity } from '../services/dashboardActivityLog';
import { getAllModulesWithExercises, createModule, saveModuleExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAdmin, requireSuperAdmin } from './adminAuth';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const router = express.Router();

/** First session in plan order → first exercise in that session (by order_index) → thumbnail_url */
function coverThumbnailFromPlanRow(plan: { plan_module?: unknown }): string | null {
  const pms = Array.isArray(plan.plan_module) ? [...plan.plan_module] : [];
  const orderVal = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  pms.sort(
    (a: { order_index?: number }, b: { order_index?: number }) =>
      orderVal(a.order_index) - orderVal(b.order_index),
  );
  const firstPm = pms[0] as
    | {
        module?: {
          module_exercise?: { order_index?: number; exercise?: { thumbnail_url?: string | null } }[];
        };
      }
    | undefined;
  if (!firstPm?.module) return null;
  const mes = Array.isArray(firstPm.module.module_exercise)
    ? [...firstPm.module.module_exercise]
    : [];
  mes.sort(
    (a: { order_index?: number }, b: { order_index?: number }) =>
      orderVal(a.order_index) - orderVal(b.order_index),
  );
  for (const me of mes) {
    const url = me?.exercise?.thumbnail_url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}

function slimPlanModulesForList(plan: { plan_module?: unknown }) {
  const pms = Array.isArray(plan.plan_module) ? [...plan.plan_module] : [];
  pms.sort(
    (a: { order_index?: number }, b: { order_index?: number }) =>
      (Number(a.order_index) || 0) - (Number(b.order_index) || 0),
  );
  return pms.map((pm: any) => ({
    plan_module_id: pm.plan_module_id != null ? Number(pm.plan_module_id) : undefined,
    module_id: Number(pm.module_id),
    order_index: Number(pm.order_index) || 0,
  }));
}

async function resolvePlanAssignedCounts(planIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const id of planIds) map.set(id, 0);
  if (planIds.length === 0) return map;
  const { data, error } = await supabaseServer.rpc('count_assigned_clients_for_plans', {
    p_plan_ids: planIds,
  });
  if (!error && data) {
    for (const row of data as { plan_id: number; client_count: number }[]) {
      map.set(Number(row.plan_id), Number(row.client_count ?? 0));
    }
    return map;
  }
  console.error(
    'count_assigned_clients_for_plans RPC failed, using user_packages fallback. PostgREST:',
    (error as { message?: string })?.message || error,
  );
  const { data: rows, error: upErr } = await supabaseServer
    .from('user_packages')
    .select('package_id, user_id')
    .in('package_id', planIds);
  if (upErr || !rows) {
    console.error('plan count fallback user_packages error:', upErr);
    return map;
  }
  const per = new Map<number, Set<string>>();
  for (const id of planIds) per.set(id, new Set());
  for (const r of rows as { package_id: number; user_id: string }[]) {
    const pid = Number(r.package_id);
    const set = per.get(pid);
    if (set) set.add(String(r.user_id));
  }
  for (const [pid, set] of per) map.set(pid, set.size);
  return map;
}

/** Match assignment ids when PostgREST returns number vs string (aligned with SQL ::text joins). */
function assignmentIdsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  if (sa === sb) return true;
  const na = Number(sa);
  const nb = Number(sb);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

async function selectInChunks<T extends Record<string, unknown>>(
  table: string,
  column: string,
  values: number[],
  select: string,
  chunkSize: number,
): Promise<T[]> {
  const out: T[] = [];
  const uniq = [...new Set(values.filter((n) => Number.isFinite(n) && n > 0))];
  for (let i = 0; i < uniq.length; i += chunkSize) {
    const chunk = uniq.slice(i, i + chunkSize);
    const { data, error } = await supabaseServer.from(table).select(select).in(column, chunk);
    if (error) {
      console.error(`module counts: ${table}.${column} chunk`, error);
      continue;
    }
    out.push(...((data ?? []) as unknown as T[]));
  }
  return out;
}

/**
 * Distinct “clients” per module (session tile), aligned with plan + user_assignment_session merge
 * and legacy user_module — computed in Node so it does not depend on count_assigned_clients_for_modules existing.
 *
 * Only loads rows for plans that include the requested modules (not a global LIMIT), so counts stay correct
 * as assignment tables grow.
 */
async function resolveModuleAssignedCounts(moduleIds: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const normalizedIds = moduleIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  for (const id of normalizedIds) result.set(id, 0);
  if (normalizedIds.length === 0) return result;

  const midSet = new Set(normalizedIds);
  const sets = new Map<number, Set<string>>();
  for (const id of normalizedIds) sets.set(id, new Set());

  const cap = 100000;

  type PlanMod = { plan_module_id: number; plan_id: number; module_id: number };
  type UpRow = { id: string | number; user_id: string; package_id: number };
  type UasRow = {
    assignment_id: string | number;
    user_id: string;
    module_id: number;
    source_plan_module_id: number | null;
    is_removed: boolean | null;
  };

  const { data: pmTouchRows, error: touchErr } = await supabaseServer
    .from('plan_module')
    .select('plan_id')
    .in('module_id', normalizedIds);
  if (touchErr) console.error('module counts: plan_module (plans touching modules)', touchErr);

  const planIdsTouching = [
    ...new Set(
      (pmTouchRows ?? [])
        .map((r) => Number((r as { plan_id: number }).plan_id))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];

  let pms: PlanMod[] = [];
  if (planIdsTouching.length > 0) {
    pms = await selectInChunks<PlanMod>(
      'plan_module',
      'plan_id',
      planIdsTouching,
      'plan_module_id, plan_id, module_id',
      120,
    );
  }

  const pmByPlan = new Map<number, { plan_module_id: number; module_id: number }[]>();
  for (const pm of pms) {
    const pid = Number(pm.plan_id);
    if (!Number.isFinite(pid)) continue;
    if (!pmByPlan.has(pid)) pmByPlan.set(pid, []);
    pmByPlan.get(pid)!.push({
      plan_module_id: Number(pm.plan_module_id),
      module_id: Number(pm.module_id),
    });
  }

  let ups: UpRow[] = [];
  if (planIdsTouching.length > 0) {
    ups = await selectInChunks<UpRow>(
      'user_packages',
      'package_id',
      planIdsTouching,
      'id, user_id, package_id',
      120,
    );
  }

  const allPlanModuleIds = [
    ...new Set(pms.map((pm) => Number(pm.plan_module_id)).filter((n) => Number.isFinite(n))),
  ];

  const uasKeySeen = new Set<string>();
  const uasList: UasRow[] = [];

  const { data: uasDirect, error: uasDirectErr } = await supabaseServer
    .from('user_assignment_session')
    .select('assignment_id, user_id, module_id, source_plan_module_id, is_removed')
    .in('module_id', normalizedIds)
    .is('source_plan_module_id', null)
    .limit(cap);
  if (uasDirectErr) console.error('module counts: user_assignment_session (direct)', uasDirectErr);
  for (const row of uasDirect ?? []) {
    const r = row as UasRow;
    const k = `d:${String(r.assignment_id)}:${r.user_id}:${r.module_id}`;
    if (uasKeySeen.has(k)) continue;
    uasKeySeen.add(k);
    uasList.push(r);
  }

  if (allPlanModuleIds.length > 0) {
    const overrideRows = await selectInChunks<UasRow>(
      'user_assignment_session',
      'source_plan_module_id',
      allPlanModuleIds,
      'assignment_id, user_id, module_id, source_plan_module_id, is_removed',
      120,
    );
    for (const r of overrideRows) {
      const k = `o:${String(r.assignment_id)}:${r.user_id}:${r.source_plan_module_id}`;
      if (uasKeySeen.has(k)) continue;
      uasKeySeen.add(k);
      uasList.push(r);
    }
  }

  for (const up of ups) {
    const aid = (up as UpRow).id;
    const uid = String((up as UpRow).user_id);
    const packageId = Number((up as UpRow).package_id);
    if (!Number.isFinite(packageId)) continue;

    const planMods = pmByPlan.get(packageId) ?? [];

    for (const pm of planMods) {
      const mid = pm.module_id;
      if (!midSet.has(mid)) continue;
      const override = uasList.find(
        (r) =>
          assignmentIdsEqual(r.assignment_id, aid) &&
          String(r.user_id) === uid &&
          r.source_plan_module_id != null &&
          Number(r.source_plan_module_id) === pm.plan_module_id,
      );
      if (override && override.is_removed === true) continue;
      sets.get(mid)!.add(uid);
    }
  }

  // Extra sessions (source_plan_module_id null): count even when no plan row lists this module or ups was empty.
  for (const r of uasList) {
    if (r.source_plan_module_id != null) continue;
    if (r.is_removed === true) continue;
    const mid = Number(r.module_id);
    if (!midSet.has(mid)) continue;
    sets.get(mid)!.add(String(r.user_id));
  }

  const { data: umRows, error: umErr } = await supabaseServer
    .from('user_module')
    .select('module_id, user_id')
    .in('module_id', normalizedIds)
    .limit(cap);
  if (umErr) console.error('module counts: user_module', umErr);
  for (const r of umRows ?? []) {
    const mid = Number((r as { module_id: number }).module_id);
    if (!midSet.has(mid)) continue;
    sets.get(mid)!.add(`um:${String((r as { user_id: number }).user_id)}`);
  }

  for (const id of normalizedIds) {
    result.set(id, sets.get(id)?.size ?? 0);
  }
  return result;
}

// ALL ROUTES BELOW REQUIRE VALID SUPABASE SESSION TOKEN
router.use(requireAdmin);

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
    void logDashboardActivity(`Added: Approved client account (${client.name || client.email || 'Client'})`);
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
    void logDashboardActivity(`Denied: Registration request (${client.name || client.email || 'Client'})`);
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
    const moduleIds = (modules as { module_id: number }[]).map((m) => m.module_id).filter((id) => id != null);
    const counts = await resolveModuleAssignedCounts(moduleIds);
    const enriched = (modules as { module_id: number }[]).map((m) => ({
      ...m,
      assigned_user_count: counts.get(m.module_id) ?? 0,
    }));
    return res.status(200).json(enriched);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * Create a new module/session (admin-only)
 */
router.post('/modules', async (req, res) => {
  try {
    const adminId = (req as any).admin?.id;
    const { title, description, session_number } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const { data, error } = await supabaseAdmin
      .from('module')
      .insert({
        title: title.trim(),
        description: description?.trim() ?? '',
        session_number: session_number ?? 1,
        created_by_admin_id: adminId ?? null,
      })
      .select('module_id, title, description, session_number')
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return res.status(500).json({ error: 'Failed to create module.' });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create module:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Update an existing module/session (admin-only)
 * PUT /api/admin/modules/:id
 * Body: { title?: string, description?: string, session_number?: number }
 */
router.put('/modules/:id', async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    if (!Number.isFinite(moduleId) || moduleId < 1) {
      return res.status(400).json({ error: 'Invalid module id.' });
    }

    const { title, description, session_number } = req.body ?? {};

    const updatePayload: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title is required.' });
      }
      updatePayload.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string.' });
      }
      updatePayload.description = description.trim();
    }
    if (session_number !== undefined) {
      const n = Number(session_number);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'Session number must be a positive integer.' });
      }
      updatePayload.session_number = n;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields provided.' });
    }

    const { data, error } = await supabaseAdmin
      .from('module')
      .update(updatePayload)
      .eq('module_id', moduleId)
      .select('module_id, title, description, session_number')
      .maybeSingle();

    if (error) {
      console.error('Error updating module:', error);
      return res.status(500).json({ error: 'Failed to update module.' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Module not found.' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Failed to update module:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Delete an existing module/session (admin-only)
 * DELETE /api/admin/modules/:id
 *
 * Note: Removes dependent rows first to avoid FK errors.
 */
router.delete('/modules/:id', async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    if (!Number.isFinite(moduleId) || moduleId < 1) {
      return res.status(400).json({ error: 'Invalid module id.' });
    }

    const { data: modRow } = await supabaseAdmin
      .from('module')
      .select('title')
      .eq('module_id', moduleId)
      .maybeSingle();
    const modTitle = String((modRow as { title?: string } | null)?.title ?? 'Session');

    // Remove relationships (best effort; ignore missing tables/rows).
    const deletions = await Promise.all([
      supabaseAdmin.from('plan_module').delete().eq('module_id', moduleId),
      supabaseAdmin.from('module_exercise').delete().eq('module_id', moduleId),
      supabaseAdmin.from('user_assignment_session').delete().eq('module_id', moduleId),
      supabaseAdmin.from('user_session_unlock').delete().eq('module_id', moduleId),
      supabaseAdmin.from('user_session_completion').delete().eq('module_id', moduleId),
    ]);
    for (const d of deletions) {
      if ((d as any)?.error) {
        console.error('Error deleting module dependencies:', (d as any).error);
        return res.status(500).json({ error: 'Failed to delete module dependencies.' });
      }
    }

    const { error: moduleError } = await supabaseAdmin
      .from('module')
      .delete()
      .eq('module_id', moduleId);

    if (moduleError) {
      console.error('Error deleting module:', moduleError);
      return res.status(500).json({ error: 'Failed to delete module.' });
    }

    void logDashboardActivity(`Deleted: Session "${modTitle}"`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete module:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * Save exercises for a module/session (admin-only)
 * PUT /api/admin/modules/:id/exercises
 * Body: { exercise_ids: number[] }
 */
router.put('/modules/:id/exercises', async (req, res) => {
  try {
    const moduleId = Number(req.params.id);
    if (!moduleId) {
      return res.status(400).json({ error: 'Invalid module id.' });
    }

    const { exercise_ids } = req.body;
    if (!Array.isArray(exercise_ids)) {
      return res.status(400).json({ error: 'exercise_ids must be an array.' });
    }

    // Delete existing mappings
    const { error: deleteError } = await supabaseAdmin
      .from('module_exercise')
      .delete()
      .eq('module_id', moduleId);

    if (deleteError) {
      console.error('Error deleting module exercises:', deleteError);
      return res.status(500).json({ error: 'Failed to update exercises.' });
    }

    // Insert new mappings
    if (exercise_ids.length > 0) {
      const rows = exercise_ids.map((exercise_id: number, index: number) => ({
        module_id: moduleId,
        exercise_id,
        order_index: index + 1,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('module_exercise')
        .insert(rows);

      if (insertError) {
        console.error('Error inserting module exercises:', insertError);
        return res.status(500).json({ error: 'Failed to save exercises.' });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to save module exercises:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post("/invite", requireSuperAdmin, async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Valid email is required" });
    }

    // First try to invite
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { role: "admin" },
        redirectTo: process.env.FRONTEND_ADMIN_INVITE_URL,
      }
    );

    if (inviteError) {
      // If user already exists but hasn't confirmed, delete and re-invite
      if (inviteError.message?.includes("already been registered")) {
        // Find and delete the unconfirmed user
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const pending = existingUser?.users?.find(
          (u) => u.email === email && !u.last_sign_in_at
        );

        if (pending) {
          await supabaseAdmin.auth.admin.deleteUser(pending.id);

          // Re-invite
          const { error: retryError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
              data: { role: "admin" },
              redirectTo: process.env.FRONTEND_ADMIN_INVITE_URL,
            }
          );

          if (retryError) {
            return res.status(500).json({ ok: false, error: retryError.message });
          }

          void logDashboardActivity(`Added: Admin invite re-sent (${email})`);
          return res.status(200).json({ ok: true });
        }

        // User exists and has actually logged in — don't overwrite
        return res.status(409).json({
          ok: false,
          error: "This email already has an active admin account.",
        });
      }

      return res.status(500).json({ ok: false, error: inviteError.message || "Failed to send invite" });
    }

    void logDashboardActivity(`Added: Admin invited (${email})`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Admin invite error:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong" });
  }
});

/**
 * ATH-254: Assign a module/plan to a client (admin-only)
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
 * Save exercises for a module (admin-only). Replaces existing module_exercise rows.
 * Body: { exercise_ids: number[] }
 */
router.put('/modules/:moduleId/exercises', async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId, 10);
    if (!Number.isInteger(moduleId) || moduleId < 1) {
      return res.status(400).json({ error: 'Invalid module id' });
    }
    const { exercise_ids } = req.body ?? {};
    if (!Array.isArray(exercise_ids)) {
      return res.status(400).json({ error: 'exercise_ids must be an array' });
    }
    await saveModuleExercises(supabaseAdmin, moduleId, exercise_ids);
    return res.status(200).json({ message: 'Exercises saved', module_id: moduleId });
  } catch (error) {
    console.error('Failed to save module exercises:', error);
    return res.status(500).json({
      error: (error instanceof Error ? error.message : 'Failed to save module exercises'),
    });
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
 * Delete a plan category (admin-only)
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: catRow } = await supabaseAdmin
      .from('plan_category')
      .select('name')
      .eq('category_id', id)
      .maybeSingle();
    const catName = String((catRow as { name?: string } | null)?.name ?? 'Category');

    const { error } = await supabaseAdmin
      .from('plan_category')
      .delete()
      .eq('category_id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category.' });
    }

    void logDashboardActivity(`Deleted: Plan category "${catName}"`);
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
          plan_module_id,
          order_index,
          module_id,
          module (
            module_exercise (
              order_index,
              exercise ( thumbnail_url )
            )
          )
        )
      `)
      .order('plan_id', { ascending: false });

    if (error) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }

    const planIds = (plans ?? []).map((p: { plan_id: number }) => Number(p.plan_id)).filter((id) => Number.isFinite(id));
    const counts = await resolvePlanAssignedCounts(planIds);
    const enriched = (plans ?? []).map((p: { plan_id: number; plan_module?: unknown }) => {
      const cover = coverThumbnailFromPlanRow(p);
      const slimPm = slimPlanModulesForList(p);
      const { plan_module: _nested, ...rest } = p as Record<string, unknown>;
      return {
        ...rest,
        plan_module: slimPm,
        cover_thumbnail_url: cover,
        assigned_user_count: counts.get(Number(p.plan_id)) ?? 0,
      };
    });

    return res.status(200).json(enriched);
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

    void logDashboardActivity(`Deleted: Plan (id ${id})`);
    return res.status(200).json({ message: 'Plan deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

function formatActivityLabel(action: string, targetName: string): string {
  const name = targetName.trim() || 'Client';
  switch (action) {
    case 'approve':
      return `Added: Approved client account (${name})`;
    case 'deny':
      return `Denied: Registration request (${name})`;
    case 'delete':
      return `Deleted: Client account (${name})`;
    default:
      return `${action} (${name})`;
  }
}

/**
 * Dashboard aggregates (ATH-437): counts, top plans by assignment, user snapshot, audit_log activity.
 */
router.get('/dashboard', async (_req, res) => {
  try {
    const [
      plansCountRes,
      modulesCountRes,
      exercisesCountRes,
      approvedUsersRes,
      pendingUsersRows,
      deniedAudit,
      packagesRows,
      allPlans,
      overviewUsers,
    ] = await Promise.all([
      supabaseAdmin.from('plan').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('module').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('exercise').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user').select('*', { count: 'exact', head: true }).eq('status', true),
      supabaseAdmin.from('user').select('user_id').eq('status', false),
      supabaseAdmin.from('audit_log').select('target_user_id').eq('action', 'deny'),
      supabaseAdmin.from('user_packages').select('package_id'),
      supabaseAdmin.from('plan').select('plan_id, title, updated_at').order('plan_id', { ascending: false }),
      supabaseAdmin
        .from('user')
        .select('user_id, fname, lname, email, status')
        .eq('status', true)
        // Alphabetical by first name, then last name, then email
        .order('fname', { ascending: true, nullsFirst: false })
        .order('lname', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })
        .limit(25),
    ]);

    let auditRows: { data: { action: string; created_at: string; target_user_id: number }[] | null } = {
      data: [],
    };
    try {
      const ar = await supabaseAdmin
        .from('audit_log')
        .select('id, action, created_at, target_user_id')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!ar.error) auditRows = ar;
    } catch {
      auditRows = { data: [] };
    }

    const plansCount = plansCountRes.count ?? 0;
    const sessionsCount = modulesCountRes.count ?? 0;
    const exercisesCount = exercisesCountRes.count ?? 0;
    const approvedCount = approvedUsersRes.count ?? 0;

    const deniedSet = deniedAudit.error
      ? new Set<number>()
      : new Set(
          (deniedAudit.data ?? []).map((r: { target_user_id: number }) =>
            Number(r.target_user_id),
          ),
        );
    if (deniedAudit.error) {
      console.warn('GET /api/admin/dashboard: audit_log deny list skipped:', deniedAudit.error.message);
    }
    const pendingCount = (pendingUsersRows.data ?? []).filter(
      (u: { user_id: number }) => !deniedSet.has(Number(u.user_id))
    ).length;
    const totalUsers = approvedCount + pendingCount;

    const countByPlan = new Map<number, number>();
    for (const row of packagesRows.data ?? []) {
      const pid = Number((row as { package_id: number }).package_id);
      if (Number.isFinite(pid)) {
        countByPlan.set(pid, (countByPlan.get(pid) ?? 0) + 1);
      }
    }

    const planList = (allPlans.data ?? []) as {
      plan_id: number;
      title: string;
      updated_at: string;
    }[];
    const sortedByAssignments = [...planList].sort((a, b) => {
      const ca = countByPlan.get(Number(a.plan_id)) ?? 0;
      const cb = countByPlan.get(Number(b.plan_id)) ?? 0;
      if (cb !== ca) return cb - ca;
      return String(a.title).localeCompare(String(b.title));
    });
    // All library plans, most-assigned first (scroll on dashboard); cap for safety.
    const topPlans = sortedByAssignments.slice(0, 200).map((p) => ({
      plan_id: p.plan_id,
      title: p.title,
      assigned_users: countByPlan.get(Number(p.plan_id)) ?? 0,
      last_edited_at: p.updated_at,
    }));

    const users = (overviewUsers.data ?? []) as {
      user_id: number;
      fname: string | null;
      lname: string | null;
      email: string | null;
      status: boolean;
    }[];
    const emails = [...new Set(users.map((u) => (u.email ?? '').trim().toLowerCase()).filter(Boolean))];
    let userOverview: {
      user_id: number;
      display_name: string;
      plan_title: string | null;
      start_date: string | null;
      status: 'active' | 'inactive';
    }[] = [];

    if (users.length > 0 && emails.length === 0) {
      userOverview = users.map((u) => ({
        user_id: u.user_id,
        display_name:
          [u.fname, u.lname].filter(Boolean).join(' ').trim() || u.email || '—',
        plan_title: null,
        start_date: null,
        status: u.status ? 'active' : 'inactive',
      }));
    } else if (emails.length > 0) {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id, email').in('email', emails);
      const profileByEmail = new Map(
        (profs ?? []).map((p: { id: string; email: string }) => [
          (p.email ?? '').trim().toLowerCase(),
          p.id,
        ])
      );
      const profileIds = [...new Set([...profileByEmail.values()])];
      let ups: { user_id: string; package_id: number; start_date: string; created_at: string }[] = [];
      if (profileIds.length > 0) {
        const upRes = await supabaseAdmin
          .from('user_packages')
          .select('user_id, package_id, start_date, created_at')
          .in('user_id', profileIds);
        ups = (upRes.data ?? []) as typeof ups;
      }
      const latestByProfile = new Map<
        string,
        { package_id: number; start_date: string; created_at: string }
      >();
      for (const row of ups) {
        const uid = String(row.user_id);
        const prev = latestByProfile.get(uid);
        const t = new Date(row.created_at).getTime();
        if (!prev || t > new Date(prev.created_at).getTime()) {
          latestByProfile.set(uid, {
            package_id: row.package_id,
            start_date: row.start_date,
            created_at: row.created_at,
          });
        }
      }
      const planIdsNeeded = [...new Set([...latestByProfile.values()].map((v) => v.package_id))];
      const planTitleById = new Map<number, string>();
      if (planIdsNeeded.length > 0) {
        const { data: planTitles } = await supabaseAdmin
          .from('plan')
          .select('plan_id, title')
          .in('plan_id', planIdsNeeded);
        for (const p of planTitles ?? []) {
          planTitleById.set(Number((p as { plan_id: number }).plan_id), String((p as { title: string }).title));
        }
      }
      userOverview = users.map((u) => {
        const emailKey = (u.email ?? '').trim().toLowerCase();
        const profileId = profileByEmail.get(emailKey);
        const latest = profileId ? latestByProfile.get(String(profileId)) : undefined;
        const display_name =
          [u.fname, u.lname].filter(Boolean).join(' ').trim() || u.email || '—';
        return {
          user_id: u.user_id,
          display_name,
          plan_title: latest ? planTitleById.get(latest.package_id) ?? null : null,
          start_date: latest?.start_date ?? null,
          status: u.status ? 'active' : 'inactive',
        };
      });
    }

    const targetIds = [
      ...new Set(
        (auditRows.data ?? []).map((r: { target_user_id: number }) => Number(r.target_user_id))
      ),
    ].filter((id) => Number.isFinite(id));
    const targetNames = new Map<number, string>();
    if (targetIds.length > 0) {
      const { data: targetUsers } = await supabaseAdmin
        .from('user')
        .select('user_id, fname, lname, email')
        .in('user_id', targetIds);
      for (const tu of targetUsers ?? []) {
        const row = tu as { user_id: number; fname: string | null; lname: string | null; email: string | null };
        const nm = [row.fname, row.lname].filter(Boolean).join(' ').trim() || row.email || 'User';
        targetNames.set(Number(row.user_id), nm);
      }
    }

    type ActivityAcc = { at: string; label: string; t: number };
    const activityItems: ActivityAcc[] = [];

    for (const r of auditRows.data ?? []) {
      activityItems.push({
        at: r.created_at,
        t: new Date(r.created_at).getTime(),
        label: formatActivityLabel(
          r.action,
          targetNames.get(Number(r.target_user_id)) ?? '',
        ),
      });
    }

    // Plan assignments: omit duplicate rows here — assign-package logs to admin_dashboard_activity
    // with admin + patient names (see assignPackage.ts logPlanAssignmentActivity).

    // Plan library updates
    try {
      const { data: recentPlans } = await supabaseAdmin
        .from('plan')
        .select('title, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(20);
      for (const p of recentPlans ?? []) {
        const row = p as { title: string; updated_at: string; created_at: string };
        const tu = new Date(row.updated_at).getTime();
        const tc = new Date(row.created_at).getTime();
        const isNew = Number.isFinite(tc) && Number.isFinite(tu) && Math.abs(tu - tc) < 3000;
        activityItems.push({
          at: row.updated_at,
          t: tu,
          label: isNew
            ? `Added: Plan "${row.title}"`
            : `Edited: Plan "${row.title}"`,
        });
      }
    } catch (err) {
      console.warn('GET /api/admin/dashboard: plan activity skipped:', err);
    }

    // Session (module) updates
    try {
      const { data: mods } = await supabaseAdmin
        .from('module')
        .select('title, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(15);
      for (const m of mods ?? []) {
        const row = m as { title: string; updated_at: string; created_at: string };
        const tu = new Date(row.updated_at).getTime();
        const tc = new Date(row.created_at).getTime();
        const isNew = Number.isFinite(tc) && Number.isFinite(tu) && Math.abs(tu - tc) < 3000;
        activityItems.push({
          at: row.updated_at,
          t: tu,
          label: isNew
            ? `Added: Session "${row.title}"`
            : `Edited: Session "${row.title}"`,
        });
      }
    } catch (err) {
      console.warn('GET /api/admin/dashboard: module activity skipped:', err);
    }

    // Exercise updates
    try {
      const { data: exs } = await supabaseAdmin
        .from('exercise')
        .select('title, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(20);
      for (const e of exs ?? []) {
        const row = e as { title: string; updated_at: string; created_at: string };
        const tu = new Date(row.updated_at).getTime();
        const tc = new Date(row.created_at).getTime();
        const isNew = Number.isFinite(tc) && Number.isFinite(tu) && Math.abs(tu - tc) < 3000;
        activityItems.push({
          at: row.updated_at,
          t: tu,
          label: isNew
            ? `Added: Exercise "${row.title}"`
            : `Edited: Exercise "${row.title}"`,
        });
      }
    } catch (err) {
      console.warn('GET /api/admin/dashboard: exercise activity skipped:', err);
    }

    // Logged deletes (and any other explicit rows) — see admin_dashboard_activity migration
    try {
      const { data: logged } = await supabaseAdmin
        .from('admin_dashboard_activity')
        .select('created_at, message')
        .order('created_at', { ascending: false })
        .limit(40);
      for (const row of logged ?? []) {
        const r = row as { created_at: string; message: string };
        activityItems.push({
          at: r.created_at,
          t: new Date(r.created_at).getTime(),
          label: r.message,
        });
      }
    } catch (err) {
      console.warn('GET /api/admin/dashboard: admin_dashboard_activity skipped:', err);
    }

    activityItems.sort((a, b) => b.t - a.t);
    const recentActivity = activityItems.slice(0, 45).map(({ at, label }) => ({ at, label }));

    return res.status(200).json({
      counts: {
        totalUsers,
        pendingUsers: pendingCount,
        plans: plansCount,
        sessions: sessionsCount,
        exercises: exercisesCount,
      },
      topPlans,
      userOverview,
      recentActivity,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

export default router;