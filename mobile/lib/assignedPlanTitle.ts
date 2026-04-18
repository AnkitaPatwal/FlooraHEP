import { supabase } from "./supabaseClient";

/**
 * trim(plan.title) for the signed-in user's latest user_packages row.
 * Uses RPC so it works when direct `plan` SELECT is blocked by RLS on some projects.
 */
export async function fetchAssignedPlanTitleForCurrentUser(): Promise<string> {
  const { data, error } = await supabase.rpc("get_my_assigned_plan_title");
  if (error) {
    if (__DEV__) {
      console.warn("[assignedPlanTitle] get_my_assigned_plan_title:", error.message);
    }
    return "";
  }
  if (data == null) return "";
  const s = typeof data === "string" ? data : String(data);
  return s.trim();
}
