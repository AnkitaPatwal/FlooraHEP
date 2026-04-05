// hooks/useRoadmap.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

export type RoadmapSession = {
  module_id: number;
  title: string;
  order_index: number;
  exercise_count: number;
  isUnlocked: boolean;
  isCompleted: boolean;
};

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

        await supabase.rpc("ensure_first_session_unlock");

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

        const { data: planRow } = await supabase
          .from("plan")
          .select("title")
          .eq("plan_id", planId)
          .maybeSingle();

        const planName = planRow?.title ?? "Your Plan";

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

        const { data: exercises, error: exercisesError } = await supabase
          .from("exercise")
          .select("module_id")
          .in("module_id", moduleIds);

        if (exercisesError) {
          setError("Failed to load exercise counts.");
          return;
        }

        const exerciseCountMap = new Map<number, number>();

        for (const moduleId of moduleIds) {
          exerciseCountMap.set(moduleId, 0);
        }

        for (const ex of exercises ?? []) {
          const moduleId = ex.module_id as number;
          exerciseCountMap.set(moduleId, (exerciseCountMap.get(moduleId) ?? 0) + 1);
        }

        const { data: unlockRows } = await supabase
          .from("user_session_unlock")
          .select("module_id, unlock_date")
          .eq("user_id", userId);

        const now = new Date();
        const unlockedSet = new Set(
          (unlockRows ?? [])
            .filter((r: any) => new Date(r.unlock_date) <= now)
            .map((r: any) => r.module_id)
        );

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
          exercise_count: exerciseCountMap.get(pm.module_id) ?? 0,
          isUnlocked: unlockedSet.has(pm.module_id),
          isCompleted: completedSet.has(pm.module_id),
        }));

        // Product requirement: Roadmap shows only locked sessions.
        const lockedSessions = sessions.filter((s) => !s.isUnlocked);

        setData({ planName, startDate, sessions: lockedSessions });
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
