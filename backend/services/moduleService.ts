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
