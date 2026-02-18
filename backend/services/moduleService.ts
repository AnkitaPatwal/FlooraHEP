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
          thumbnail_photo_id
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
