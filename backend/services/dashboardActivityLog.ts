import { supabaseServer } from '../lib/supabaseServer';

/** Best-effort log for dashboard "Recent activity" (deletes, etc.). */
export async function logDashboardActivity(message: string): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) return;
  try {
    const { error } = await supabaseServer
      .from('admin_dashboard_activity')
      .insert({ message: trimmed });
    if (error) {
      console.warn('admin_dashboard_activity insert skipped:', error.message);
    }
  } catch (e) {
    console.warn('admin_dashboard_activity insert failed:', e);
  }
}
