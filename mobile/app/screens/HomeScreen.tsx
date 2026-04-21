import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import colors from "../../constants/colors";
import { FlooraFonts } from "../../constants/fonts";
import { sessionCardStyles } from "../../constants/sessionCardChrome";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { fetchAssignedPlanTitleForCurrentUser } from "../../lib/assignedPlanTitle";
import { phaseTitleForOrderIndex } from "../../lib/phaseTitles";

type SessionItem = {
  user_assignment_session_id?: string;
  module_id: number | string;
  title?: string;
  exerciseCount?: number;
  order_index: number;
  unlocked: boolean;
  completed: boolean;
};

function isUnlockedByLocalDate(unlockIso: string | null | undefined): boolean {
  if (!unlockIso) return false;
  const d = new Date(unlockIso);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  const unlockLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  return unlockLocal <= todayLocal;
}

const fallbackSessionImage = require("../../assets/images/current-session.jpg");

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
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  sectionHeadingBlock: {
    marginBottom: 0,
  },
  planNameHero: {
    fontFamily: FlooraFonts.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.brand,
    marginBottom: 4,
  },
  planPhaseSub: {
    fontFamily: FlooraFonts.semiBold,
    fontSize: 18,
    color: colors.brand,
    marginBottom: 4,
  },
  sessionsLabel: {
    fontFamily: FlooraFonts.regular,
    fontSize: 18,
    color: "#374151",
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
  /** Current session: no card shadow — elevation only on the thumbnail (see profile Sign out). */
  currentSessionCard: {
    marginBottom: 12,
  },
  currentBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 2,
  },
  currentBadgeText: {
    fontFamily: FlooraFonts.extraBold,
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  completedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#6B7280",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 2,
  },
  completedBadgeText: {
    fontFamily: FlooraFonts.extraBold,
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  sessionCompletedLabel: {
    fontFamily: FlooraFonts.regular,
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
    fontFamily: FlooraFonts.bold,
    fontSize: 28,
    color: "#0F172A",
  },
  logoImage: {
    width: 120,
    height: 44,
    resizeMode: "contain",
    tintColor: colors.brand,
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
    fontFamily: FlooraFonts.semiBold,
    color: "#FFFFFF",
    fontSize: 16,
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
  const [refreshing, setRefreshing] = useState(false);
  const [sessionThumbs, setSessionThumbs] = useState<Record<string, string>>({});
  const [planTitle, setPlanTitle] = useState("");
  const [currentAssignmentId, setCurrentAssignmentId] = useState("");
  const [planPhaseTitle, setPlanPhaseTitle] = useState("");

  const fetchAssignedSessions = useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        if (authLoading) {
          return;
        }

        if (!session?.user?.id) {
          setError("Unable to load user.");
          setSessions([]);
          setSessionThumbs({});
          setPlanTitle("");
          setPlanPhaseTitle("");
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
          .select("id, package_id")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (packageError || !packageRow) {
          setHasAssignedPlan(false);
          setSessions([]);
          setSessionThumbs({});
          setPlanTitle("");
          setPlanPhaseTitle("");
          setCurrentAssignmentId("");
          return;
        }

        setHasAssignedPlan(true);
        setCurrentAssignmentId(String((packageRow as any).id ?? ""));
        setPlanTitle(await fetchAssignedPlanTitleForCurrentUser());

        const { error: rpcUnlockBootstrapError } = await supabase.rpc("ensure_first_session_unlock");
        if (__DEV__ && rpcUnlockBootstrapError) {
          console.warn("[HomeScreen] ensure_first_session_unlock failed:", rpcUnlockBootstrapError.message);
        }

        type AssignedSessionRow = {
          user_assignment_session_id: string;
          module_id: number;
          order_index: number;
          title: string;
        };
        let planModules:
          | { type: "assigned"; rows: AssignedSessionRow[] }
          | { type: "template"; rows: { module_id: number; order_index: number }[] }
          | null = null;

        try {
          const { data: assignedRows, error: assignedErr } = await supabase.rpc("get_current_assigned_sessions");
          if (!assignedErr && Array.isArray(assignedRows) && assignedRows.length > 0) {
            planModules = {
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
          // fall back to template plan_module
        }

        if (!planModules) {
          const { data: templateRows, error: planModulesError } = await supabase
            .from("plan_module")
            .select("module_id, order_index")
            .eq("plan_id", packageRow.package_id)
            .order("order_index", { ascending: true });

          if (planModulesError || !templateRows || templateRows.length === 0) {
            setSessions([]);
            setSessionThumbs({});
            return;
          }

          planModules = {
            type: "template",
            rows: (templateRows as any[]).map((pm) => ({
              module_id: Number((pm as any).module_id),
              order_index: Number((pm as any).order_index),
            })),
          };
        }

        const moduleIds =
          planModules.type === "assigned"
            ? planModules.rows.map((r) => r.module_id)
            : planModules.rows.map((r) => r.module_id);

        const titleByModuleId =
          planModules.type === "assigned"
            ? new Map<number, string>(planModules.rows.map((r) => [r.module_id, r.title]))
            : null;

        let modulesData: { module_id: number; title: string }[] = [];
        if (titleByModuleId && planModules.type === "assigned") {
          modulesData = planModules.rows.map((r) => ({ module_id: r.module_id, title: r.title }));
        } else {
          const { data, error: modulesError } = await supabase
            .from("module")
            .select("module_id, title")
            .in("module_id", moduleIds)
            .order("module_id", { ascending: true });

          if (modulesError) {
            setError("Failed to load assigned sessions.");
            setSessions([]);
            return;
          }
          modulesData = (data as any[]) ?? [];
        }

        let countsByModule: Record<string, number> = {};
        /** When RPC succeeds for a module, we already have first-exercise thumbnail (no second fetch). */
        const exerciseRpcByModule: Record<string, { ok: true; thumb: string }> = {};

        // Prefer per-assignment merged exercise list for accurate counts (respects add/remove overrides).
        try {
          const countEntries = await Promise.all(
            moduleIds.map(async (moduleId: number | string) => {
              const { data: rows, error: rpcErr } = await supabase.rpc(
                "get_current_assigned_session_exercises",
                { p_module_id: Number(moduleId) }
              );
              if (!rpcErr && Array.isArray(rows)) {
                const idStr = String(moduleId);
                let thumb = "";
                if (rows.length > 0) {
                  const u = String((rows[0] as { thumbnail_url?: string })?.thumbnail_url ?? "");
                  if (u.startsWith("http")) thumb = u;
                }
                exerciseRpcByModule[idStr] = { ok: true, thumb };
                return [idStr, rows.length] as const;
              }
              throw new Error("rpc-unavailable");
            })
          );
          countsByModule = Object.fromEntries(countEntries);
        } catch {
          // fall back to legacy counts (API or template)
        }

        if (Object.keys(countsByModule).length === 0 && isExerciseApiConfigured()) {
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
        } else if (Object.keys(countsByModule).length === 0) {
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

        const uasIds =
          planModules.type === "assigned"
            ? planModules.rows.map((r) => r.user_assignment_session_id).filter(Boolean)
            : [];

        const [
          { data: unlockRows, error: unlockQueryError },
          { data: completionRows, error: completionQueryError },
        ] = await Promise.all([
          uasIds.length > 0
            ? supabase
                .from("user_assignment_session_unlock")
                .select("user_assignment_session_id, unlock_date")
                .eq("user_id", authUserId)
                .in("user_assignment_session_id", uasIds)
            : Promise.resolve({ data: [], error: null } as any),
          uasIds.length > 0
            ? supabase
                .from("user_assignment_session_completion")
                .select("user_assignment_session_id, completed_at")
                .eq("user_id", authUserId)
                .in("user_assignment_session_id", uasIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const unlockTrackingUnavailable =
          !!rpcUnlockBootstrapError || !!unlockQueryError || !!completionQueryError;

        const unlockByUasId = new Map<string, string>(
          (unlockRows || []).map((r: any) => [
            String((r as any).user_assignment_session_id),
            String((r as any).unlock_date),
          ])
        );
        const completedUasIds = new Set<string>(
          (completionRows || []).map((r: any) => String((r as any).user_assignment_session_id))
        );

        const noUnlockRowsRead =
          !unlockQueryError &&
          !rpcUnlockBootstrapError &&
          uasIds.length > 0 &&
          unlockByUasId.size === 0;

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

        const merged: SessionItem[] = [];
        const orderedRows =
          planModules.type === "assigned"
            ? planModules.rows
            : planModules.rows;

        const rowsInOrder = (orderedRows as any[]).slice().sort((a, b) => {
          const ao = Number((a as any).order_index ?? 0);
          const bo = Number((b as any).order_index ?? 0);
          if (ao !== bo) return ao - bo;
          return String((a as any).user_assignment_session_id ?? "").localeCompare(
            String((b as any).user_assignment_session_id ?? "")
          );
        });

        for (let idx = 0; idx < rowsInOrder.length; idx++) {
          const pm = rowsInOrder[idx];
          const mod = moduleMap.get(pm.module_id);
          if (!mod) continue;
          const uasId =
            planModules.type === "assigned"
              ? String((pm as any).user_assignment_session_id ?? "")
              : "";
          const unlockIso = uasId ? unlockByUasId.get(uasId) : undefined;
          const scheduledReached = useAth420ShowAllSessions ? true : isUnlockedByLocalDate(unlockIso);
          const prevUasId =
            planModules.type === "assigned" && idx > 0
              ? String((rowsInOrder[idx - 1] as any).user_assignment_session_id ?? "")
              : "";
          const prevOk =
            planModules.type === "assigned" ? (idx === 0 ? true : completedUasIds.has(prevUasId)) : true;
          const unlocked = scheduledReached && prevOk;
          merged.push({
            user_assignment_session_id: uasId || undefined,
            module_id: mod.module_id,
            title: mod.title,
            order_index: pm.order_index,
            unlocked,
            completed: uasId ? completedUasIds.has(uasId) : false,
            exerciseCount: countsByModule[String(mod.module_id)] || 0,
          });
        }

        // Phase label should reflect plan progression even when the next session is still locked.
        // Choose the first not-completed session in plan order; if all are completed, use the last.
        const mergedInOrder = merged.slice().sort((a, b) => a.order_index - b.order_index);
        const phaseOrderIndex =
          mergedInOrder.find((s) => !s.completed)?.order_index ??
          (mergedInOrder.length > 0 ? mergedInOrder[mergedInOrder.length - 1].order_index : null);
        setPlanPhaseTitle(phaseOrderIndex != null ? phaseTitleForOrderIndex(phaseOrderIndex) : "");

        const visible = merged.filter((s) => s.unlocked);
        // Keep deterministic ordering for UI computations (current = lowest order_index).
        visible.sort((a, b) => a.order_index - b.order_index);

        // Session thumbnail = first exercise thumbnail; resolve before paint so cards don't flash the placeholder.
        const nextThumbs: Record<string, string> = {};
        for (const s of visible) {
          const k = String(s.module_id);
          const meta = exerciseRpcByModule[k];
          if (meta?.thumb?.startsWith("http")) {
            nextThumbs[k] = meta.thumb;
          }
        }

        const needRpcThumb = visible.filter((s) => {
          const k = String(s.module_id);
          if (exerciseRpcByModule[k]?.ok) return false;
          return !nextThumbs[k];
        });

        if (needRpcThumb.length > 0) {
          try {
            const entries = await Promise.all(
              needRpcThumb.map(async (s) => {
                const { data: rows, error: rpcErr } = await supabase.rpc(
                  "get_current_assigned_session_exercises",
                  { p_module_id: Number(s.module_id) }
                );
                if (rpcErr || !Array.isArray(rows) || rows.length === 0) {
                  return [String(s.module_id), ""] as const;
                }
                const thumb = String((rows[0] as { thumbnail_url?: string })?.thumbnail_url ?? "");
                return [String(s.module_id), thumb] as const;
              })
            );
            for (const [mid, url] of entries) {
              if (typeof url === "string" && url.startsWith("http")) {
                nextThumbs[mid] = url;
              }
            }
          } catch {
            // optional thumbnails
          }
        }

        setSessionThumbs(nextThumbs);
        setSessions(visible);
      } catch (err) {
        setError("Something went wrong.");
        setSessions([]);
        setSessionThumbs({});
        setPlanTitle("");
        setPlanPhaseTitle("");
      } finally {
        setLoading(false);
      }
  }, [session, authLoading]);

  useFocusEffect(
    useCallback(() => {
      void fetchAssignedSessions();
    }, [fetchAssignedSessions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssignedSessions();
    setRefreshing(false);
  }, [fetchAssignedSessions]);

  const goToSession = (moduleId: string, sessionName: string, uasId?: string) => {
    router.push({
      pathname: "/screens/SessionExerciseList",
      params: {
        sessionId: moduleId,
        sessionName,
        ...(uasId ? { userAssignmentSessionId: uasId } : {}),
        ...(currentAssignmentId ? { assignmentId: currentAssignmentId } : {}),
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

  const completedSessions = sessions.filter((s) => s.completed);

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
          <Image
            testID="home-floora-logo"
            source={require("../../assets/images/flooraLogo.png")}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="Floora"
          />
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F9AA8" />
        }
      >
        <View style={styles.sectionHeadingBlock}>
          {hasAssignedPlan ? (
            <>
              <Text style={styles.planNameHero} numberOfLines={2}>
                {planTitle.trim() || "Your Plan"}
              </Text>
              {planPhaseTitle ? (
                <Text style={styles.planPhaseSub} numberOfLines={1}>
                  {planPhaseTitle}
                </Text>
              ) : null}
            </>
          ) : null}
          <Text style={styles.sessionsLabel}>Sessions</Text>
        </View>
        <View style={styles.accentLine} />

        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasAssignedPlan
              ? "No unlocked sessions yet. Complete the previous session or wait until the next unlock date."
              : "No assigned sessions yet."}
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
                      currentSession.title || "Session",
                      currentSession.user_assignment_session_id
                    )
                  }
                  style={{ minHeight: 44 }}
                >
                  <View style={styles.currentSessionCard}>
                    <View style={sessionCardStyles.mediaElevatedCurrent}>
                      <View style={styles.currentBadge} pointerEvents="none">
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                      <View style={sessionCardStyles.mediaShell}>
                        <Image
                          source={
                            sessionThumbs[String(currentSession.module_id)]
                              ? { uri: sessionThumbs[String(currentSession.module_id)] }
                              : fallbackSessionImage
                          }
                          style={sessionCardStyles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                    <Text style={sessionCardStyles.caption}>
                      <Text style={sessionCardStyles.captionStrong}>
                        {currentSession.title || "Session"}
                      </Text>
                      <Text style={sessionCardStyles.captionMeta}>
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
                {completedSessions.map((sessionItem, completedIndex) => (
                  <TouchableOpacity
                    key={`completed-oidx-${sessionItem.order_index}-mid-${String(sessionItem.module_id)}-i-${completedIndex}`}
                    activeOpacity={0.9}
                    onPress={() =>
                      goToSession(
                        String(sessionItem.module_id),
                        sessionItem.title || "Session",
                        sessionItem.user_assignment_session_id
                      )
                    }
                    style={{ minHeight: 44 }}
                  >
                    <View style={sessionCardStyles.tile}>
                      <View style={styles.completedBadge} pointerEvents="none">
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                      <View style={sessionCardStyles.mediaShell}>
                        <Image
                          source={
                            sessionThumbs[String(sessionItem.module_id)]
                              ? { uri: sessionThumbs[String(sessionItem.module_id)] }
                              : fallbackSessionImage
                          }
                          style={sessionCardStyles.mediaImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={sessionCardStyles.caption}>
                        <Text style={sessionCardStyles.captionStrong}>
                          {sessionItem.title || "Session"}
                        </Text>
                        <Text style={sessionCardStyles.captionMeta}>
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
