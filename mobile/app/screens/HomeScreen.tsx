import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import colors from "../../constants/colors";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";

type SessionItem = {
  module_id: number | string;
  title?: string;
  exerciseCount?: number;
  order_index: number;
  unlocked: boolean;
  completed: boolean;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  cardCaption: {
    fontSize: 20,
    color: "#374151",
    marginTop: 10,
    marginBottom: 22,
  },
  cardCaptionStrong: {
    fontWeight: "800",
    color: "#1F2937",
  },
  cardCaptionMeta: {
    color: "#374151",
  },
  sessionTile: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 12,
  },
  sessionTileCurrent: {
    borderWidth: 2,
    borderColor: "#0F766E",
  },
  sessionCompletedLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  brandText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2B8C8E",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  retryButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#0D2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

const HomeScreen = () => {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasAssignedPlan, setHasAssignedPlan] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    const fetchAssignedSessions = async () => {
      try {
        setLoading(true);
        setError("");

        if (authLoading) {
          return;
        }

        if (!session?.user?.id) {
          setError("Unable to load user.");
          setSessions([]);
          setLoading(false);
          return;
        }

        const authUserId = session.user.id;
        const email = session.user.email ?? (global as any)?.userEmail ?? "";

        if (email) {
          const { data: userRow, error: userError } = await supabase
            .from("user")
            .select("fname")
            .eq("email", email)
            .maybeSingle();

          if (!userError && userRow) {
            const firstName = (userRow as { fname?: string }).fname?.trim();
            if (firstName) {
              setDisplayName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
            }
          }
        }

        const { data: packageRow, error: packageError } = await supabase
          .from("user_packages")
          .select("package_id")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (packageError || !packageRow) {
          setHasAssignedPlan(false);
          setSessions([]);
          return;
        }

        setHasAssignedPlan(true);

        const { error: rpcUnlockBootstrapError } = await supabase.rpc("ensure_first_session_unlock");
        if (__DEV__ && rpcUnlockBootstrapError) {
          console.warn("[HomeScreen] ensure_first_session_unlock failed:", rpcUnlockBootstrapError.message);
        }

        const { data: planModules, error: planModulesError } = await supabase
          .from("plan_module")
          .select("module_id, order_index")
          .eq("plan_id", packageRow.package_id)
          .order("order_index", { ascending: true });

        if (planModulesError || !planModules || planModules.length === 0) {
          setSessions([]);
          return;
        }

        const moduleIds = planModules.map((item: { module_id: number }) => item.module_id);

        const { data: modulesData, error: modulesError } = await supabase
          .from("module")
          .select("module_id, title")
          .in("module_id", moduleIds)
          .order("module_id", { ascending: true });

        if (modulesError) {
          setError("Failed to load assigned sessions.");
          setSessions([]);
          return;
        }

        let countsByModule: Record<string, number> = {};

        if (isExerciseApiConfigured()) {
          const countEntries = await Promise.all(
            moduleIds.map(async (moduleId: number | string) => {
              try {
                const rows = await fetchExerciseListByModule(moduleId);
                return [String(moduleId), rows.length] as const;
              } catch {
                return [String(moduleId), 0] as const;
              }
            })
          );
          countsByModule = Object.fromEntries(countEntries);
        } else {
          const { data: moduleExerciseRows } = await supabase
            .from("module_exercise")
            .select("module_id, exercise_id")
            .in("module_id", moduleIds);

          countsByModule = (moduleExerciseRows || []).reduce<Record<string, number>>((acc, row: { module_id: number }) => {
            const key = String(row.module_id);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
        }

        const [
          { data: unlockRows, error: unlockQueryError },
          { data: completionRows, error: completionQueryError },
        ] = await Promise.all([
          supabase
            .from("user_session_unlock")
            .select("module_id, unlock_date")
            .eq("user_id", authUserId)
            .in("module_id", moduleIds),
          supabase
            .from("user_session_completion")
            .select("module_id, completed_at")
            .eq("user_id", authUserId)
            .in("module_id", moduleIds),
        ]);

        const unlockTrackingUnavailable =
          !!rpcUnlockBootstrapError || !!unlockQueryError || !!completionQueryError;

        const unlockByModule = new Map<number, string>(
          (unlockRows || []).map((r: { module_id: number; unlock_date: string }) => [
            r.module_id,
            r.unlock_date,
          ])
        );
        const completedModules = new Set<number>(
          (completionRows || []).map((r: { module_id: number }) => r.module_id)
        );

        const noUnlockRowsRead =
          !unlockQueryError &&
          !rpcUnlockBootstrapError &&
          moduleIds.length > 0 &&
          unlockByModule.size === 0;

        const useAth420ShowAllSessions = unlockTrackingUnavailable || noUnlockRowsRead;

        if (__DEV__ && useAth420ShowAllSessions) {
          console.warn(
            "[HomeScreen] Session unlock fallback — showing all assigned modules (unlock tracking missing or empty).",
            unlockTrackingUnavailable
              ? {
                  rpc: rpcUnlockBootstrapError?.message,
                  unlock: unlockQueryError?.message,
                  completion: completionQueryError?.message,
                }
              : { reason: "no unlock rows (apply ATH-426 migrations / RLS)" }
          );
        }

        const moduleMap = new Map(
          (modulesData || []).map((m: { module_id: number; title: string }) => [m.module_id, m])
        );

        const now = Date.now();
        const merged: SessionItem[] = [];
        for (const pm of planModules as { module_id: number; order_index: number }[]) {
          const mod = moduleMap.get(pm.module_id);
          if (!mod) continue;
          const unlockIso = unlockByModule.get(pm.module_id);
          const unlocked = useAth420ShowAllSessions
            ? true
            : unlockIso != null && new Date(unlockIso).getTime() <= now;
          merged.push({
            module_id: mod.module_id,
            title: mod.title,
            order_index: pm.order_index,
            unlocked,
            completed: completedModules.has(pm.module_id),
            exerciseCount: countsByModule[String(mod.module_id)] || 0,
          });
        }

        const visible = merged.filter((s) => s.unlocked);
        visible.sort((a, b) => b.order_index - a.order_index);
        setSessions(visible);
      } catch (err) {
        setError("Something went wrong.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSessions();
  }, [session?.user?.id, authLoading]);

  const goToSession = (moduleId: string, sessionName: string) => {
    router.push({
      pathname: "/screens/SessionExerciseList",
      params: { sessionId: moduleId, sessionName },
    });
  };

  const currentSession = (() => {
    let best: SessionItem | null = null;
    for (const s of sessions) {
      if (s.completed) continue;
      if (!best || s.order_index < best.order_index) best = s;
    }
    return best;
  })();

  if (authLoading || loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#0F9AA8" />
        <Text style={styles.stateText}>Loading sessions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Hi {displayName || "there"}!</Text>
          <Text style={styles.brandText}>Floora</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Assigned Sessions</Text>
        <View style={styles.accentLine} />

        {sessions.length > 0 ? (
          sessions.map((sessionItem) => {
            const isCurrent = currentSession?.module_id === sessionItem.module_id;
            return (
              <TouchableOpacity
                key={String(sessionItem.module_id)}
                activeOpacity={0.9}
                onPress={() =>
                  goToSession(String(sessionItem.module_id), sessionItem.title || "Session")
                }
                style={{ minHeight: 44 }}
              >
                <View style={[styles.sessionTile, isCurrent && styles.sessionTileCurrent]}>
                  <View style={styles.card}>
                    <Image
                      source={require("../../assets/images/current-session.jpg")}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.cardCaption}>
                    <Text style={styles.cardCaptionStrong}>{sessionItem.title || "Session"}</Text>
                    <Text style={styles.cardCaptionMeta}>
                      {` | ${sessionItem.exerciseCount ?? 0} `}
                      {(sessionItem.exerciseCount ?? 0) === 1 ? "Exercise" : "Exercises"}
                    </Text>
                    {isCurrent ? (
                      <Text style={styles.cardCaptionMeta}> — Current</Text>
                    ) : null}
                  </Text>
                  {sessionItem.completed ? (
                    <Text style={styles.sessionCompletedLabel}>Completed</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            {hasAssignedPlan
              ? "No unlocked sessions yet. Complete the previous session or wait until the next unlock date."
              : "No assigned sessions yet."}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
