/**
 * Session unlock and completion tracking.
 * Uses Supabase RPC and direct queries.
 */

import { supabase } from "./supabaseClient";

export type SessionStatus = "locked" | "unlocked" | "completed";

export interface ModuleProgress {
  module_id: number;
  order_index: number;
  title: string;
  status: SessionStatus;
  unlock_date?: string;
  completed_at?: string;
}

/**
 * Returns the plan title for the current user's most recent assigned package.
 * Uses RPC (bypasses RLS) so it works regardless of plan table policies.
 */
export async function getAssignedPlanTitle(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return "";

  const { data, error } = await supabase.rpc("get_assigned_plan_title", {
    p_user_id: user.id,
  });
  if (error || data == null) return "";
  return String(data).trim();
}

/**
 * Ensures Session 1 is unlocked for the current user (lazy init on first visit).
 * Call this when loading the home/roadmap screen.
 */
export async function ensureSession1Unlocked(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  await supabase.rpc("ensure_session_1_unlocked", { p_user_id: user.id });
}

/**
 * Marks a session (module) as complete. Idempotent.
 * Triggers Session N+1 unlock in 7 days.
 */
export async function completeSession(moduleId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  await supabase.rpc("complete_session", {
    p_user_id: user.id,
    p_module_id: moduleId,
  });
}

/**
 * Fetches unlock state for the user's plan modules.
 * Returns locked/unlocked/completed per module.
 * Call ensureSession1Unlocked() first if this is the first visit.
 */
export async function getUnlockState(): Promise<ModuleProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return [];

  // Ensure Session 1 is unlocked (lazy init)
  await ensureSession1Unlocked();

  // Get user's most recent package (skip rows with null package_id)
  const { data: pkg, error: pkgErr } = await supabase
    .from("user_packages")
    .select("package_id")
    .eq("user_id", user.id)
    .not("package_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pkgErr || !pkg) return [];

  // Get plan modules in order
  const { data: planModules, error: pmErr } = await supabase
    .from("plan_module")
    .select("module_id, order_index")
    .eq("plan_id", pkg.package_id)
    .order("order_index", { ascending: true });

  if (pmErr || !planModules?.length) return [];

  const moduleIds = planModules.map((pm: { module_id: number }) => pm.module_id);

  // Get module titles
  const { data: modulesData } = await supabase
    .from("module")
    .select("module_id, title")
    .in("module_id", moduleIds);

  const titleMap = new Map(
    (modulesData || []).map((m: { module_id: number; title: string }) => [m.module_id, m.title])
  );

  // Get completions
  const { data: completions } = await supabase
    .from("user_session_completion")
    .select("module_id, completed_at")
    .eq("user_id", user.id)
    .in("module_id", moduleIds);

  const completedMap = new Map(
    (completions || []).map((c: { module_id: number; completed_at: string }) => [
      c.module_id,
      c.completed_at,
    ])
  );

  // Get unlocks
  const { data: unlocks } = await supabase
    .from("user_session_unlock")
    .select("module_id, unlock_date")
    .eq("user_id", user.id)
    .in("module_id", moduleIds);

  const unlockMap = new Map(
    (unlocks || []).map((u: { module_id: number; unlock_date: string }) => [
      u.module_id,
      u.unlock_date,
    ])
  );

  const now = new Date().toISOString();

  return planModules.map((pm: { module_id: number; order_index: number }) => {
    const moduleId = pm.module_id;
    const completedAt = completedMap.get(moduleId);
    const unlockDate = unlockMap.get(moduleId);

    let status: SessionStatus = "locked";
    if (completedAt) {
      status = "completed";
    } else if (unlockDate && unlockDate <= now) {
      status = "unlocked";
    }

    return {
      module_id: moduleId,
      order_index: pm.order_index,
      title: titleMap.get(moduleId) || `Session ${pm.order_index}`,
      status,
      unlock_date: unlockDate,
      completed_at: completedAt,
    };
  });
}

/**
 * Returns the "current session" = lowest-numbered unlocked session not yet completed.
 */
export function getCurrentSession(progress: ModuleProgress[]): ModuleProgress | null {
  return progress.find((p) => p.status === "unlocked") ?? null;
}
