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
};

export function useRoadmap(): UseRoadmapResult {
  const { session } = useAuth();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const { data: planModules, error: planModulesError } = await supabase
          .from("plan_module")
          .select("module_id, order_index")
          .eq("plan_id", planId)
          .order("order_index", { ascending: true });

        if (planModulesError || !planModules || planModules.length === 0) {
          setData({ planName, startDate, sessions: [] });
          return;
        }

        const moduleIds = planModules.map((pm: any) => pm.module_id);

        const { data: modules, error: modulesError } = await supabase
          .from("module")
          .select("module_id, title")
          .in("module_id", moduleIds);

        if (modulesError) {
          setError("Failed to load sessions.");
          return;
        }

        const moduleMap = new Map(
          (modules ?? []).map((m: any) => [m.module_id, m.title])
        );

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

        const sessions: RoadmapSession[] = planModules.map((pm: any) => ({
          module_id: pm.module_id,
          title: moduleMap.get(pm.module_id) ?? `Session ${pm.order_index + 1}`,
          order_index: pm.order_index,
          exercise_count: exerciseCountMap.get(pm.module_id) ?? 0,
          isUnlocked: unlockedSet.has(pm.module_id),
          isCompleted: completedSet.has(pm.module_id),
        }));

        setData({ planName, startDate, sessions });
      } catch (err) {
        setError("Something went wrong loading your roadmap.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session?.user?.id]);

  return { data, loading, error };
}