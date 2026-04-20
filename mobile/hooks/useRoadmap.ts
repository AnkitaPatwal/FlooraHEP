// hooks/useRoadmap.ts
import { useEffect, useState } from "react";
import { fetchAssignedPlanTitleForCurrentUser } from "../lib/assignedPlanTitle";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

export type RoadmapSession = {
  user_assignment_session_id?: string;
  module_id: number;
  title: string;
  order_index: number;
  isUnlocked: boolean;
  isCompleted: boolean;
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
          .select("package_id, start_date, session_layout_published_at, created_at")
          .eq("user_id", userId)
          // Roadmap must reflect what's actually live for the patient.
          // Draft assignments can exist and may have different start_date; exclude them.
          .not("session_layout_published_at", "is", null)
          .order("session_layout_published_at", { ascending: false })
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
        type AssignedSessionRow = {
          user_assignment_session_id: string;
          module_id: number;
          order_index: number;
          title: string;
        };
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
                user_assignment_session_id: String((r as any).user_assignment_session_id ?? ""),
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

        const uasIds =
          sessionsSource.type === "assigned"
            ? sessionsSource.rows.map((r) => r.user_assignment_session_id).filter(Boolean)
            : [];

        const { data: unlockRows } =
          uasIds.length > 0
            ? await supabase
                .from("user_assignment_session_unlock")
                .select("user_assignment_session_id, unlock_date")
                .eq("user_id", userId)
                .in("user_assignment_session_id", uasIds)
            : { data: [] as any[] };

        const unlockDateByUasId = new Map<string, string>(
          (unlockRows ?? []).map((r: any) => [
            String((r as any).user_assignment_session_id),
            String((r as any).unlock_date),
          ])
        );
        const unlockedSet = new Set(
          (unlockRows ?? [])
            .filter((r: any) => isUnlockedByLocalDate(String((r as any).unlock_date)))
            .map((r: any) => String((r as any).user_assignment_session_id))
        );

        const { data: completionRows } =
          uasIds.length > 0
            ? await supabase
                .from("user_assignment_session_completion")
                .select("user_assignment_session_id")
                .eq("user_id", userId)
                .in("user_assignment_session_id", uasIds)
            : { data: [] as any[] };

        const completedSet = new Set(
          (completionRows ?? []).map((r: any) => String((r as any).user_assignment_session_id))
        );

        // ── 8. Assemble sessions in plan order ────────────────────────────────
        const rows =
          sessionsSource.type === "assigned"
            ? sessionsSource.rows
            : sessionsSource.rows;

        const rowsSorted = [...rows].sort(
          (a: any, b: any) =>
            Number(a.order_index) - Number(b.order_index) ||
            String((a as any).user_assignment_session_id ?? "").localeCompare(
              String((b as any).user_assignment_session_id ?? "")
            )
        );

        const sessions: RoadmapSession[] = rowsSorted.map((pm: any, idx: number) => {
          const uasId =
            sessionsSource.type === "assigned"
              ? String((pm as any).user_assignment_session_id ?? "")
              : "";
          const unlockIso = uasId ? unlockDateByUasId.get(uasId) : undefined;
          const scheduledReached = uasId ? unlockedSet.has(uasId) : false;
          const prevUasId =
            sessionsSource.type === "assigned" && idx > 0
              ? String((rowsSorted[idx - 1] as any).user_assignment_session_id ?? "")
              : "";
          const prevOk =
            sessionsSource.type === "assigned" ? (idx === 0 ? true : completedSet.has(prevUasId)) : true;
          return {
            user_assignment_session_id: uasId || undefined,
            module_id: pm.module_id,
            title: moduleMap.get(pm.module_id) ?? `Session ${pm.order_index + 1}`,
            order_index: pm.order_index,
            isUnlocked: scheduledReached && prevOk,
            isCompleted: uasId ? completedSet.has(uasId) : false,
            unlockDate: unlockIso ?? null,
          };
        });

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
