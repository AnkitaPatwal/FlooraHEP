import { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoMeta {
  bucket: string;
  object_key: string;
  original_filename?: string;
  mime_type?: string;
}

export interface ExerciseWithVideo {
  exercise_id: number;
  title: string;
  description?: string;
  video_id: number | null;
  video: VideoMeta | null;
  video_url: string | null;
}

export interface ModuleWithExercises {
  module_id: number;
  title: string;
  description?: string;
  exercises: ExerciseWithVideo[];
}

export interface PlanWithHierarchy {
  plan_id: number;
  title: string;
  description?: string;
  modules: ModuleWithExercises[];
}

export interface AdminAccessResult {
  plans: { plan_id: number; title: string }[];
  modules: { module_id: number; title: string }[];
  exercises: { exercise_id: number; title: string }[];
  rlsError: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPublicUrl(supabase: SupabaseClient, bucket: string, objectKey: string): string | null {
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectKey);
  return data?.publicUrl ?? null;
}

function toArray<T>(val: T | T[] | null | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// ─── AC1 + AC2 + AC3: hierarchical query ─────────────────────────────────────
//
// Junction-table hierarchy (from your Supabase schema):
//   plan  ↔  plan_module  ↔  module  ↔  module_exercise  ↔  exercise → video
//
// Supabase resolves junction tables automatically in nested selects.

/**
 * Returns a single plan with its nested modules → exercises → video metadata.
 *
 * AC1: plans load with associated modules and exercises
 * AC2: exercises include metadata (title, video URL, mime type)
 * AC3: data returned in the expected hierarchical structure
 */
export async function getPlanWithHierarchy(
  supabase: SupabaseClient,
  planId: number,
): Promise<PlanWithHierarchy> {
  const { data, error } = await supabase
    .from('plan')
    .select(`
      plan_id,
      title,
      description,
      plan_module (
        module (
          module_id,
          title,
          description,
          module_exercise (
            exercise (
              exercise_id,
              title,
              description,
              video_id,
              video:video_id (
                bucket,
                object_key,
                original_filename,
                mime_type
              )
            )
          )
        )
      )
    `)
    .eq('plan_id', planId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch plan hierarchy: ${error?.message}`);
  }

  const row = data as any;

  const modules: ModuleWithExercises[] = toArray(row.plan_module).map((pm: any) => {
    const mod = pm.module;

    const exercises: ExerciseWithVideo[] = toArray(mod?.module_exercise).map((me: any) => {
      const ex = me.exercise;
      const videoObj: VideoMeta | null = toArray(ex?.video)[0] ?? null;
      const video_url = videoObj?.object_key
        ? getPublicUrl(supabase, videoObj.bucket, videoObj.object_key)
        : null;

      return {
        exercise_id: ex.exercise_id,
        title: ex.title,
        description: ex.description ?? undefined,
        video_id: ex.video_id ?? null,
        video: videoObj,
        video_url,
      };
    });

    return {
      module_id: mod.module_id,
      title: mod.title,
      description: mod.description ?? undefined,
      exercises,
    };
  });

  return {
    plan_id: row.plan_id,
    title: row.title,
    description: row.description ?? undefined,
    modules,
  };
}

// ─── Admin role check ─────────────────────────────────────────────────────────
//
// Your schema has both an `admin_users` table and a `profiles` table.
// We check admin_users — if a row exists for this user_id, they are an admin.

/**
 * Returns true if the given user_id exists in the admin_users table.
 */
export async function isAdminUser(
  supabase: SupabaseClient,
  userId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" — user is simply not an admin
    if (error.code === 'PGRST116') return false;
    throw new Error(`Failed to check admin status: ${error.message}`);
  }

  return !!data;
}

// ─── AC4 + AC5: admin access verification ────────────────────────────────────

/**
 * Verifies that the authenticated admin user can read all seeded plans,
 * modules, and exercises without hitting RLS errors.
 *
 * AC4: admin user can read all seeded plans, modules, and exercises
 * AC5: no permission or RLS errors occur for admin access
 */
export async function verifyAdminAccess(
  supabase: SupabaseClient,
): Promise<AdminAccessResult> {
  const [plansRes, modulesRes, exercisesRes] = await Promise.all([
    supabase.from('plan').select('plan_id, title'),
    supabase.from('module').select('module_id, title'),
    supabase.from('exercise').select('exercise_id, title'),
  ]);

  const rlsError =
    plansRes.error?.message ??
    modulesRes.error?.message ??
    exercisesRes.error?.message ??
    null;

  return {
    plans: plansRes.data ?? [],
    modules: modulesRes.data ?? [],
    exercises: exercisesRes.data ?? [],
    rlsError,
  };
}