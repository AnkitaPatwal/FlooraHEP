import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import { theme } from "../../constants/theme";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import SessionCard, { type SessionTileState } from "../../components/SessionCard";

type SessionItem = {
  module_id: number | string;
  title?: string;
  exerciseCount?: number;
  order_index: number;
  unlocked: boolean;
  completed: boolean;
};

function withDashboardTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`dashboard_load timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const sessionImage = require("../../assets/images/current-session.jpg");

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  container: {
    paddingHorizontal: theme.space.screenHorizontal,
    paddingTop: theme.space.screenTop,
    paddingBottom: 80,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: theme.color.surface,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space.formBodyHorizontal,
  },
  stateText: {
    ...theme.typography.body,
    textAlign: "center",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.color.muted,
    marginTop: 4,
    flexShrink: 1,
  },
  /** Roadmap order: plan headline (H1) → teal meta → accent → section (H2) → teal meta → cards */
  planHeadline: {
    ...theme.typography.planTitle,
    marginBottom: 4,
  },
  planMeta: {
    ...theme.typography.planSubtitle,
    marginBottom: 12,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    marginBottom: theme.space.sectionTitleBottom,
  },
  sectionMeta: {
    ...theme.typography.sectionSubtitle,
    marginBottom: 12,
  },
  accentLine: {
    width: theme.layout.accentLineWidth,
    height: theme.layout.accentLineHeight,
    borderRadius: theme.radius.accentBar,
    backgroundColor: theme.color.accent,
    marginTop: theme.space.accentLineMarginTop,
    marginBottom: theme.space.accentLineMarginBottom,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 14,
    marginBottom: 10,
  },
  header: {
    paddingHorizontal: theme.space.screenHorizontal,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  greeting: {
    ...theme.typography.greeting,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  brandText: {
    ...theme.typography.brandWordmark,
    flexShrink: 0,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  retryButton: {
    ...theme.button.inverse,
    marginTop: 16,
  },
  retryButtonText: {
    ...theme.button.inverseText,
  },
});

const HomeScreen = () => {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasAssignedPlan, setHasAssignedPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchAssignedSessions = useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        if (authLoading) {
          return;
        }

        if (!session?.user?.id) {
          setError("Unable to load user.");
          setPlanTitle("");
          setSessions([]);
          setLoading(false);
          return;
        }

        const authUserId = session.user.id;

        await withDashboardTimeout(
          (async () => {
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

            if (packageError || !packageRow?.package_id) {
              if (__DEV__ && packageError) {
                console.warn("[HomeScreen] user_packages:", packageError.message);
              }
              setHasAssignedPlan(false);
              setPlanTitle("");
              setSessions([]);
              return;
            }

            setHasAssignedPlan(true);

            let assignedTitle = "";
            const { data: rpcTitle, error: rpcTitleError } = await supabase.rpc("get_my_assigned_plan_title");
            if (__DEV__ && rpcTitleError) {
              console.warn("[HomeScreen] get_my_assigned_plan_title:", rpcTitleError.message);
            }
            if (!rpcTitleError && rpcTitle != null) {
              assignedTitle = String(rpcTitle).trim();
            }
            if (!assignedTitle) {
              const { data: planRow, error: planSelectError } = await supabase
                .from("plan")
                .select("title")
                .eq("plan_id", packageRow.package_id)
                .maybeSingle();
              if (__DEV__ && planSelectError) {
                console.warn("[HomeScreen] plan.title fallback:", planSelectError.message);
              }
              assignedTitle = (planRow as { title?: string } | null)?.title?.trim() ?? "";
            }
            setPlanTitle(assignedTitle);

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
          })(),
          90_000
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("timed out")) {
          setError("Loading took too long. Check your connection, then use Retry below.");
        } else {
          setError("Something went wrong.");
        }
        setSessions([]);
      } finally {
        setLoading(false);
      }
  }, [session, authLoading]);

  useFocusEffect(
    useCallback(() => {
      void fetchAssignedSessions();
    }, [fetchAssignedSessions])
  );

  useEffect(() => {
    void fetchAssignedSessions();
  }, [fetchAssignedSessions, reloadKey]);

  const goToSession = (moduleId: string, sessionName: string) => {
    router.push({
      pathname: "/screens/SessionExerciseList",
      params: {
        sessionId: moduleId,
        sessionName,
        moduleId,
        ...(planTitle ? { planName: planTitle, subtitle: "Restore" } : {}),
      },
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

  const tileStateFor = (sessionItem: SessionItem): SessionTileState => {
    if (sessionItem.completed) return "completed";
    if (currentSession?.module_id === sessionItem.module_id) return "current";
    return "available";
  };

  if (authLoading || loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={theme.color.primary} />
        <Text style={styles.stateText}>Loading sessions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError("");
            setReloadKey((k) => k + 1);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting} numberOfLines={2}>
            Hi {displayName || "there"}!
          </Text>
          <Text style={styles.brandText}>Floora</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingBottom: theme.space.scrollBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F9AA8" />
        }
      >
        {hasAssignedPlan ? (
          <>
            <Text style={styles.planHeadline} numberOfLines={2}>
              {planTitle.trim() || "Your care plan"}
            </Text>
            <Text style={styles.planMeta}>Assigned to your account</Text>
            <View style={styles.accentLine} />
            <Text style={styles.sectionTitle}>Your Assigned Sessions</Text>
            <Text style={styles.sectionMeta}>
              {sessions.length === 1
                ? "1 session"
                : sessions.length === 0
                  ? "No sessions unlocked yet"
                  : `${sessions.length} sessions`}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your Assigned Sessions</Text>
            <View style={styles.accentLine} />
          </>
        )}

        {sessions.length > 0 ? (
          sessions.map((sessionItem) => (
            <SessionCard
              key={String(sessionItem.module_id)}
              title={sessionItem.title || "Session"}
              exerciseCount={sessionItem.exerciseCount ?? 0}
              image={sessionImage}
              state={tileStateFor(sessionItem)}
              onPress={() =>
                goToSession(String(sessionItem.module_id), sessionItem.title || "Session")
              }
            />
          ))
        ) : (
          <Text style={styles.emptyText}>
            {hasAssignedPlan
              ? "No unlocked sessions yet. Complete the previous session or wait until the next unlock date."
              : "No care plan is linked to this login yet. Your clinic assigns plans to your account email. If you use a different email in the app than the one they used, ask them to update it or sign in with that email."}
          </Text>
        ) : (
          <>
            {currentSession ? (
              <>
                <TouchableOpacity
                  key={`current-${String(currentSession.module_id)}`}
                  activeOpacity={0.9}
                  onPress={() =>
                    goToSession(
                      String(currentSession.module_id),
                      currentSession.title || "Session"
                    )
                  }
                  style={{ minHeight: 44 }}
                >
                  <View style={[styles.sessionTile, styles.sessionTileCurrent]}>
                    <View style={styles.currentBadge} pointerEvents="none">
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                    <View style={styles.card}>
                      <Image
                        source={
                          sessionThumbs[String(currentSession.module_id)]
                            ? { uri: sessionThumbs[String(currentSession.module_id)] }
                            : fallbackSessionImage
                        }
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={styles.cardCaption}>
                      <Text style={styles.cardCaptionStrong}>
                        {currentSession.title || "Session"}
                      </Text>
                      <Text style={styles.cardCaptionMeta}>
                        {` | ${currentSession.exerciseCount ?? 0} `}
                        {(currentSession.exerciseCount ?? 0) === 1
                          ? "Exercise"
                          : "Exercises"}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            {/* Sequential UX: show only the single "current" session to do next. */}

            {completedSessions.length > 0 ? (
              <>
                {completedSessions.map((sessionItem) => (
                  <TouchableOpacity
                    key={`completed-${String(sessionItem.module_id)}`}
                    activeOpacity={0.9}
                    onPress={() =>
                      goToSession(
                        String(sessionItem.module_id),
                        sessionItem.title || "Session"
                      )
                    }
                    style={{ minHeight: 44 }}
                  >
                    <View style={styles.sessionTile}>
                      <View style={styles.completedBadge} pointerEvents="none">
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                      <View style={styles.card}>
                        <Image
                          source={
                            sessionThumbs[String(sessionItem.module_id)]
                              ? { uri: sessionThumbs[String(sessionItem.module_id)] }
                              : fallbackSessionImage
                          }
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.cardCaption}>
                        <Text style={styles.cardCaptionStrong}>
                          {sessionItem.title || "Session"}
                        </Text>
                        <Text style={styles.cardCaptionMeta}>
                          {` | ${sessionItem.exerciseCount ?? 0} `}
                          {(sessionItem.exerciseCount ?? 0) === 1
                            ? "Exercise"
                            : "Exercises"}
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
