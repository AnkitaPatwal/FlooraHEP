import { useEffect, useState } from "react";
import { fetchAssignedPlanTitleForCurrentUser } from "../lib/assignedPlanTitle";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

export type RoadmapSession = {
  module_id: number;
  title: string;
  order_index: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  /** From `user_session_unlock` when present; used for messaging. */
  unlockDate: string | null;
  /** First exercise thumbnail; loaded before roadmap UI shows locked cards (avoids placeholder flash). */
  thumbnailUrl?: string;
};

function isUnlockedByLocalDate(unlockIso: string | null | undefined): boolean {
  if (!unlockIso) return false;
  const d = new Date(unlockIso);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  const unlockLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return unlockLocal <= todayLocal;
}

export type RoadmapData = {
  planName: string;
  startDate: string | null;
  sessions: RoadmapSession[];
};

type UseRoadmapResult = {
  data: RoadmapData | null;
  loading: boolean;
  error: string;
  reload: () => void;
};

async function fetchFirstExerciseThumbnailUrl(moduleId: number): Promise<string | undefined> {
  try {
    const { data: rows, error: rpcErr } = await supabase.rpc("get_current_assigned_session_exercises", {
      p_module_id: Number(moduleId),
    });
    if (rpcErr || !Array.isArray(rows) || rows.length === 0) return undefined;
    const u = String((rows[0] as { thumbnail_url?: string })?.thumbnail_url ?? "");
    return u.startsWith("http") ? u : undefined;
  } catch {
    return undefined;
  }
}

export function useRoadmap(): UseRoadmapResult {
  const { session } = useAuth();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const reload = () => setReloadNonce((n) => n + 1);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const userId = session.user.id;

        // ── 1. Bootstrap Session 1 unlock (safe to call every time) ──────────
        await supabase.rpc("ensure_first_session_unlock");

        // ── 2. Fetch the user's most recent package ───────────────────────────
        const { data: packageRow, error: packageError } = await supabase
          .from("user_packages")
          .select("package_id, start_date")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (packageError || !packageRow) {
          setData({ planName: "Your Plan", startDate: null, sessions: [] });
          return;
        }

        const planId = packageRow.package_id;
        const startDate = packageRow.start_date ?? null;

        // ── 3. Plan title (RPC: reliable when direct `plan` SELECT is RLS-blocked) ──
        const planTitleRpc = (await fetchAssignedPlanTitleForCurrentUser()).trim();
        const planName = planTitleRpc !== "" ? planTitleRpc : "Your Plan";

        // ── 4. Fetch sessions list (prefer per-assignment overrides) ──────────
        type AssignedSessionRow = { module_id: number; order_index: number; title: string };
        let sessionsSource:
          | { type: "assigned"; rows: AssignedSessionRow[] }
          | { type: "template"; rows: { module_id: number; order_index: number }[] }
          | null = null;

        try {
          const { data: assignedRows, error: assignedErr } = await supabase.rpc("get_current_assigned_sessions");
          if (!assignedErr && Array.isArray(assignedRows) && assignedRows.length > 0) {
            sessionsSource = {
              type: "assigned",
              rows: (assignedRows as any[]).map((r) => ({
                module_id: Number((r as any).module_id),
                order_index: Number((r as any).order_index),
                title: String((r as any).title ?? ""),
              })),
            };
          }
        } catch {
          // fall back to template plan_module ordering
        }

        if (!sessionsSource) {
          const { data: planModules, error: planModulesError } = await supabase
            .from("plan_module")
            .select("module_id, order_index")
            .eq("plan_id", planId)
            .order("order_index", { ascending: true });

          if (planModulesError || !planModules || planModules.length === 0) {
            setData({ planName, startDate, sessions: [] });
            return;
          }

          sessionsSource = {
            type: "template",
            rows: (planModules as any[]).map((pm) => ({
              module_id: Number((pm as any).module_id),
              order_index: Number((pm as any).order_index),
            })),
          };
        }

        const moduleIds =
          sessionsSource.type === "assigned"
            ? sessionsSource.rows.map((r) => r.module_id)
            : sessionsSource.rows.map((r) => r.module_id);

        const titleByModuleId =
          sessionsSource.type === "assigned"
            ? new Map<number, string>(sessionsSource.rows.map((r) => [r.module_id, r.title]))
            : null;

        // ── 5. Fetch module titles if not provided by RPC ─────────────────────
        let moduleMap: Map<number, string>;
        if (titleByModuleId) {
          moduleMap = titleByModuleId;
        } else {
          const { data: modules, error: modulesError } = await supabase
            .from("module")
            .select("module_id, title")
            .in("module_id", moduleIds);

          if (modulesError) {
            setError("Failed to load sessions.");
            return;
          }

          moduleMap = new Map((modules ?? []).map((m: any) => [m.module_id, m.title]));
        }

        // ── 6. Fetch unlock state for this user ───────────────────────────────
        const { data: unlockRows } = await supabase
          .from("user_session_unlock")
          .select("module_id, unlock_date")
          .eq("user_id", userId);

        const unlockDateByModuleId = new Map<number, string>(
          (unlockRows ?? []).map((r: any) => [Number(r.module_id), String(r.unlock_date)])
        );
        // Unlocked once the local calendar date reaches unlock_date (ignore time-of-day).
        const unlockedSet = new Set(
          (unlockRows ?? [])
            .filter((r: any) => isUnlockedByLocalDate(String(r.unlock_date)))
            .map((r: any) => r.module_id)
        );

        // ── 7. Fetch completion state for this user ───────────────────────────
        const { data: completionRows } = await supabase
          .from("user_session_completion")
          .select("module_id")
          .eq("user_id", userId);

        const completedSet = new Set(
          (completionRows ?? []).map((r: any) => r.module_id)
        );

        // ── 8. Assemble sessions in plan order ────────────────────────────────
        const rows =
          sessionsSource.type === "assigned"
            ? sessionsSource.rows
            : sessionsSource.rows;

        const sessions: RoadmapSession[] = rows.map((pm: any) => ({
          module_id: pm.module_id,
          title: moduleMap.get(pm.module_id) ?? `Session ${pm.order_index + 1}`,
          order_index: pm.order_index,
          isUnlocked: unlockedSet.has(pm.module_id),
          isCompleted: completedSet.has(pm.module_id),
          unlockDate: unlockDateByModuleId.get(pm.module_id) ?? null,
        }));

        sessions.sort((a, b) => a.order_index - b.order_index);
        const lockedSessions = sessions.filter((s) => !s.isUnlocked);

        const lockedWithThumbs: RoadmapSession[] =
          lockedSessions.length === 0
            ? []
            : await Promise.all(
                lockedSessions.map(async (s) => {
                  const thumbnailUrl = await fetchFirstExerciseThumbnailUrl(s.module_id);
                  return thumbnailUrl ? { ...s, thumbnailUrl } : s;
                })
              );

        setData({ planName, startDate, sessions: lockedWithThumbs });
      } catch (err) {
        setError("Something went wrong loading your roadmap.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session?.user?.id, reloadNonce]);

  return { data, loading, error, reload };
}
