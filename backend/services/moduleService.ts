import { SupabaseClient } from '@supabase/supabase-js'

export async function getAllModulesWithExercises(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from('module')
    .select(`
      module_id,
      title,
      description,
      category,
      session_number,
      created_at,
      module_exercise (
        module_exercise_id,
        order_index,
        sets_override,
        reps_override,
        exercise (
          exercise_id,
          title,
          description,
          default_sets,
          default_reps,
          video_id,
          thumbnail_photo_id,
          thumbnail_url
        )
      )
    `)
    .order('session_number', { ascending: true })
    .order('order_index', {
      foreignTable: 'module_exercise',
      ascending: true,
    })

    if (error) {
      console.error('Error fetching modules:', error.message)
      throw new Error('Failed to retrieve modules')
    }

  return data ?? []
}

/**
 * Distinct assignees per module (session):
 * - Legacy direct assignment: public.user_module (bigint user_id).
 * - Plan / package assignment: user_packages + plan_module, minus per-assignment
 *   removals and plus added sessions (user_assignment_session).
 *
 * Count keys are prefixed (legacy: / auth:) so the same person in both systems
 * may appear twice until identities are linked; most deployments use one path.
 */
export async function attachAssignedUserCountsToModules(
  supabase: SupabaseClient,
  modules: Record<string, unknown>[]
): Promise<void> {
  if (modules.length === 0) return

  const byModule = new Map<number, Set<string>>()
  const addUser = (moduleId: number, userKey: string) => {
    if (!Number.isFinite(moduleId)) return
    if (!byModule.has(moduleId)) byModule.set(moduleId, new Set())
    byModule.get(moduleId)!.add(userKey)
  }

  const { data: umRows, error: umErr } = await supabase
    .from('user_module')
    .select('module_id, user_id')

  if (!umErr && umRows) {
    for (const row of umRows as { module_id: number; user_id: number }[]) {
      addUser(Number(row.module_id), `legacy:${row.user_id}`)
    }
  }

  const { data: packages, error: upErr } = await supabase
    .from('user_packages')
    .select('id, user_id, package_id')

  if (upErr || !packages?.length) {
    for (const m of modules) {
      const id = Number((m as { module_id?: number }).module_id)
      ;(m as { assigned_user_count: number }).assigned_user_count = Number.isFinite(id)
        ? byModule.get(id)?.size ?? 0
        : 0
    }
    return
  }

  const planIds = [
    ...new Set(
      (packages as { package_id: number }[])
        .map((p) => Number(p.package_id))
        .filter((n) => Number.isFinite(n))
    ),
  ]
  const assignmentIds = (packages as { id: unknown }[]).map((p) => p.id)

  let pmRows: { plan_module_id: number; plan_id: number; module_id: number }[] = []
  if (planIds.length > 0) {
    const pmRes = await supabase
      .from('plan_module')
      .select('plan_module_id, plan_id, module_id')
      .in('plan_id', planIds)
    if (!pmRes.error && pmRes.data) {
      pmRows = pmRes.data as { plan_module_id: number; plan_id: number; module_id: number }[]
    }
  }

  let uasRows: {
    assignment_id: number | string
    source_plan_module_id: number | null
    module_id: number
    is_removed: boolean | null
  }[] = []
  if (assignmentIds.length > 0) {
    const uasRes = await supabase
      .from('user_assignment_session')
      .select('assignment_id, source_plan_module_id, module_id, is_removed')
      .in('assignment_id', assignmentIds as any)
    if (!uasRes.error && uasRes.data) {
      uasRows = uasRes.data as typeof uasRows
    }
  }

  const pmByPlan = new Map<number, { plan_module_id: number; module_id: number }[]>()
  for (const pm of pmRows) {
    const pid = Number(pm.plan_id)
    if (!Number.isFinite(pid)) continue
    if (!pmByPlan.has(pid)) pmByPlan.set(pid, [])
    pmByPlan.get(pid)!.push({
      plan_module_id: Number(pm.plan_module_id),
      module_id: Number(pm.module_id),
    })
  }

  const uasByAssignment = new Map<
    string,
    { source_plan_module_id: number | null; module_id: number; is_removed: boolean }[]
  >()
  for (const r of uasRows) {
    const aid = String(r.assignment_id)
    if (!uasByAssignment.has(aid)) uasByAssignment.set(aid, [])
    uasByAssignment.get(aid)!.push({
      source_plan_module_id:
        r.source_plan_module_id != null && r.source_plan_module_id !== undefined
          ? Number(r.source_plan_module_id)
          : null,
      module_id: Number(r.module_id),
      is_removed: r.is_removed === true,
    })
  }

  for (const up of packages as { id: unknown; user_id: string; package_id: number }[]) {
    const assignmentIdStr = String(up.id)
    const planId = Number(up.package_id)
    const userKey = `auth:${String(up.user_id)}`
    const planModuleList = pmByPlan.get(planId) ?? []
    const uasList = uasByAssignment.get(assignmentIdStr) ?? []

    const overridesByPlanModule = new Map<number, { is_removed: boolean }>()
    const addedSessions: { module_id: number; is_removed: boolean }[] = []
    for (const u of uasList) {
      if (u.source_plan_module_id != null) {
        overridesByPlanModule.set(u.source_plan_module_id, { is_removed: u.is_removed })
      } else {
        addedSessions.push({ module_id: u.module_id, is_removed: u.is_removed })
      }
    }

    for (const pm of planModuleList) {
      const ov = overridesByPlanModule.get(pm.plan_module_id)
      if (ov?.is_removed) continue
      addUser(pm.module_id, userKey)
    }
    for (const a of addedSessions) {
      if (a.is_removed) continue
      addUser(a.module_id, userKey)
    }
  }

  for (const m of modules) {
    const id = Number((m as { module_id?: number }).module_id)
    ;(m as { assigned_user_count: number }).assigned_user_count = Number.isFinite(id)
      ? byModule.get(id)?.size ?? 0
      : 0
  }
}

/**
 * Create a new module (ATH-413 Module Builder).
 * created_by_admin_id must be a valid admin_users.id (UUID).
 */
export async function createModule(
  supabase: SupabaseClient,
  params: {
    title: string
    description: string
    session_number: number
    created_by_admin_id: string
  }
) {
  const { title, description, session_number, created_by_admin_id } = params
  if (!title?.trim()) {
    throw new Error('Title is required')
  }
  if (!Number.isInteger(session_number) || session_number < 1) {
    throw new Error('Session number must be a positive integer')
  }
  if (!created_by_admin_id) {
    throw new Error('created_by_admin_id is required')
  }

  const { data, error } = await supabase
    .from('module')
    .insert({
      title: title.trim(),
      description: description?.trim() ?? '',
      session_number,
      created_by_admin_id,
    })
    .select('module_id, title, description, session_number, created_at')
    .single()

  if (error) {
    console.error('Error creating module:', error.message)
    throw new Error(error.message || 'Failed to create module')
  }
  return data
}

/**
 * Save module-to-exercise mapping for a module (ATH-413).
 * Replaces existing module_exercise rows. exercise_ids order = order_index.
 * Duplicates in exercise_ids are deduplicated (first occurrence wins).
 */
export async function saveModuleExercises(
  supabase: SupabaseClient,
  moduleId: number,
  exerciseIds: number[]
) {
  if (!Number.isInteger(moduleId) || moduleId < 1) {
    throw new Error('Invalid module id')
  }
  const seen = new Set<number>()
  const ordered = exerciseIds.filter((id) => {
    if (!Number.isInteger(id) || id < 1) return false
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  const { error: deleteError } = await supabase
    .from('module_exercise')
    .delete()
    .eq('module_id', moduleId)

  if (deleteError) {
    console.error('Error clearing module exercises:', deleteError.message)
    throw new Error(deleteError.message || 'Failed to save module exercises')
  }

  if (ordered.length === 0) {
    return { module_id: moduleId, exercise_ids: [] }
  }

  const rows = ordered.map((exercise_id, i) => ({
    module_id: moduleId,
    exercise_id,
    order_index: i + 1,
  }))

  const { error: insertError } = await supabase.from('module_exercise').insert(rows)

  if (insertError) {
    console.error('Error inserting module exercises:', insertError.message)
    throw new Error(insertError.message || 'Failed to save module exercises')
  }

  return { module_id: moduleId, exercise_ids: ordered }
}
