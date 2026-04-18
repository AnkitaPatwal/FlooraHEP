/**
 * Session (Exercise List) — ATH-428
 * Lists exercises for a plan module (session) via module_exercise + exercise.
 * Dashboard and Roadmap navigate here with sessionId + sessionName.
 *
 * Plan session *sequence* is defined in Postgres: `plan_module.order_index` per plan.
 * Unlock/completion (first session, then N+1 after 7 days) uses that order in RPC/triggers.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircularBackButton, CIRCULAR_BACK_BUTTON_SIZE } from "../../components/CircularBackButton";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { Exercise } from "../../types/exercise";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { fetchAssignedPlanTitleForCurrentUser } from "../../lib/assignedPlanTitle";
import { supabase } from "../../lib/supabaseClient";
import {
  getMaxCompletedExercisePosition,
  isExercisePositionUnlocked,
} from "../../lib/sessionExerciseProgress";
import { useAuth } from "../../providers/AuthProvider";
import { FlooraFonts } from "../../constants/fonts";
import colors from "../../constants/colors";
import { sessionCardStyles } from "../../constants/sessionCardChrome";
import session1Img from "../../assets/images/prev-1.jpg";

type Params = {
  sessionId?: string;
  sessionName?: string;
  planName?: string;
  subtitle?: string;
};

export default function SessionExerciseList() {
  const router = useRouter();
  const { session } = useAuth();
  const { sessionId, sessionName, planName, subtitle } = useLocalSearchParams<Params>();

  const [apiExercises, setApiExercises] = useState<Exercise[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [maxCompletedExercisePosition, setMaxCompletedExercisePosition] = useState(0);
  const [fetchedPlanName, setFetchedPlanName] = useState("");

  const paramPlanName = typeof planName === "string" ? planName.trim() : "";
  const planFromDbOrRoute = fetchedPlanName.trim() || paramPlanName;
  /** Passed to exercise detail; avoid showing generic placeholder when we have a real title. */
  const displayPlanName = planFromDbOrRoute || "Your Plan";
  const planInNav = planFromDbOrRoute !== "";

  const headerTitle = (sessionName != null ? String(sessionName) : "").trim() || "Session";

  const moduleIdNum = useMemo(() => {
    const n = sessionId ? parseInt(String(sessionId), 10) : NaN;
    return Number.isInteger(n) ? n : null;
  }, [sessionId]);

  const refreshCompletion = useCallback(async () => {
    if (!session?.user?.id || moduleIdNum == null) return;
    const { data } = await supabase
      .from("user_session_completion")
      .select("module_id")
      .eq("user_id", session.user.id)
      .eq("module_id", moduleIdNum)
      .maybeSingle();
    setSessionCompleted(!!data);
  }, [session?.user?.id, moduleIdNum]);

  const loadExerciseProgress = useCallback(async () => {
    if (!session?.user?.id || moduleIdNum == null) {
      setMaxCompletedExercisePosition(0);
      return;
    }
    const max = await getMaxCompletedExercisePosition(session.user.id, moduleIdNum);
    setMaxCompletedExercisePosition(max);
  }, [session?.user?.id, moduleIdNum]);

  useFocusEffect(
    useCallback(() => {
      refreshCompletion();
      void loadExerciseProgress();
    }, [refreshCompletion, loadExerciseProgress])
  );

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    void (async () => {
      const title = await fetchAssignedPlanTitleForCurrentUser();
      if (!cancelled) setFetchedPlanName(title);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const topBarTitle = planInNav ? planFromDbOrRoute : headerTitle;

  const mapToExercise = (ex: {
    exercise_id: number;
    title: string;
    description?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
    sets?: number | null;
    reps?: number | null;
  }): Exercise => {
    const out: Exercise = {
      id: String(ex.exercise_id),
      title: ex.title,
      description: ex.description ?? "",
      tags: [],
      videoSignedUrl: ex.video_url ?? "",
      thumbnail:
        typeof ex.thumbnail_url === "string" && ex.thumbnail_url.startsWith("http")
          ? { uri: ex.thumbnail_url }
          : undefined,
    };
    // Attach prescription metadata for navigation/display (Exercise type remains unchanged).
    if (ex.sets != null && Number.isFinite(Number(ex.sets))) (out as any).sets = Number(ex.sets);
    if (ex.reps != null && Number.isFinite(Number(ex.reps))) (out as any).reps = Number(ex.reps);
    return out;
  };

  useEffect(() => {
    const loadExercises = async () => {
      const moduleId = sessionId ? parseInt(String(sessionId), 10) : NaN;
      if (!Number.isInteger(moduleId) || moduleId < 1) {
        setApiExercises([]);
        setApiLoading(false);
        return;
      }

      // Prefer per-assignment overrides (template + add/remove + sets/reps) via RPC.
      try {
        const { data: assignedRows, error: assignedErr } = await supabase.rpc(
          "get_current_assigned_session_exercises",
          { p_module_id: moduleId }
        );
        if (!assignedErr && Array.isArray(assignedRows) && assignedRows.length > 0) {
          setApiExercises(
            (assignedRows as any[]).map((r) =>
              mapToExercise({
                exercise_id: Number((r as any).exercise_id),
                title: String((r as any).title ?? ""),
                description: (r as any).description ?? "",
                thumbnail_url: (r as any).thumbnail_url ?? null,
                video_url: (r as any).video_url ?? null,
                sets: (r as any).sets == null ? null : Number((r as any).sets),
                reps: (r as any).reps == null ? null : Number((r as any).reps),
              })
            )
          );
          setApiLoading(false);
          return;
        }
      } catch {
        // fall through to API/Supabase template reads
      }

      if (isExerciseApiConfigured()) {
        try {
          const apiRows = await fetchExerciseListByModule(moduleId);
          if (apiRows.length > 0) {
            setApiExercises(apiRows.map((ex) => mapToExercise(ex)));
            setApiLoading(false);
            return;
          }
        } catch {
          // fall through to Supabase
        }
      }

      const { data: meRows, error: meError } = await supabase
        .from("module_exercise")
        .select("exercise_id, order_index")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (!meError && meRows?.length) {
        const exIds = meRows.map((r) => r.exercise_id);
        const { data: exRows, error: exError } = await supabase
          .from("exercise")
          .select("exercise_id, title, description, thumbnail_url, video_url, video:video_id(bucket, object_key)")
          .in("exercise_id", exIds)
          .order("exercise_id", { ascending: true });

        if (!exError && exRows?.length) {
          type ExerciseRow = {
            exercise_id: number;
            title: string;
            description: string | null;
            thumbnail_url: string | null;
            video_url: string | null;
            video: { bucket: string; object_key: string } | { bucket: string; object_key: string }[] | null;
          };

          const ordered = meRows
            .map((me) => exRows.find((e) => e.exercise_id === me.exercise_id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .map((row) => {
              const r = row as ExerciseRow;
              const v = r.video;
              const video = Array.isArray(v) ? (v[0] ?? null) : v ?? null;
              return { ...r, video };
            });

          setApiExercises(
            ordered.map((ex) => {
              let videoUrl = ex.video_url ?? "";
              if (!videoUrl && ex.video?.bucket && ex.video?.object_key) {
                const { data } = supabase.storage.from(ex.video.bucket).getPublicUrl(ex.video.object_key);
                videoUrl = data?.publicUrl ?? "";
              }
              return mapToExercise({ ...ex, video_url: videoUrl });
            })
          );
          setApiLoading(false);
          return;
        }
      }

      setApiExercises([]);
      setApiLoading(false);
    };

    loadExercises();
  }, [sessionId]);

  const exercises = useMemo(() => apiExercises, [apiExercises]);

  const openExerciseDetail = (exercise: Exercise, positionInSession: number, sessionTotal: number) => {
    const videoUrl = (exercise as { videoSignedUrl?: string }).videoSignedUrl;
    const sets = (exercise as any)?.sets;
    const reps = (exercise as any)?.reps;
    const moduleIdParam = String(sessionId ?? "");
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: String(exercise.id),
        moduleId: moduleIdParam,
        sessionId: moduleIdParam,
        sessionName: headerTitle,
        planName: displayPlanName,
        exercisePosition: String(positionInSession),
        sessionExerciseTotal: String(sessionTotal),
        exerciseTitle: exercise.title || "Exercise",
        exerciseDescription: exercise.description ?? "",
        sessionCompleted: sessionCompleted ? "1" : "0",
        ...(Number.isFinite(Number(sets)) ? { sets: String(sets) } : {}),
        ...(Number.isFinite(Number(reps)) ? { reps: String(reps) } : {}),
        ...(videoUrl ? { videoUrl } : {}),
      },
    });
  };

  const onExercisePress = (exercise: Exercise, positionInSession: number, sessionTotal: number) => {
    if (sessionCompleted) {
      openExerciseDetail(exercise, positionInSession, sessionTotal);
      return;
    }
    if (!isExercisePositionUnlocked(maxCompletedExercisePosition, positionInSession)) {
      Alert.alert("Locked", "Watch the previous exercise in this session first.");
      return;
    }
    openExerciseDetail(exercise, positionInSession, sessionTotal);
  };

  const moduleIdValid = sessionId && Number.isInteger(parseInt(String(sessionId), 10)) && parseInt(String(sessionId), 10) > 0;

  const onRefresh = useCallback(async () => {
    setListRefreshing(true);
    try {
      const moduleId = sessionId ? parseInt(String(sessionId), 10) : NaN;
      if (!Number.isInteger(moduleId) || moduleId < 1) {
        setApiExercises([]);
        await refreshCompletion();
        await loadExerciseProgress();
        return;
      }
      try {
        const { data: assignedRows, error: assignedErr } = await supabase.rpc(
          "get_current_assigned_session_exercises",
          { p_module_id: moduleId }
        );
        if (!assignedErr && Array.isArray(assignedRows) && assignedRows.length > 0) {
          setApiExercises(
            (assignedRows as any[]).map((r) =>
              mapToExercise({
                exercise_id: Number((r as any).exercise_id),
                title: String((r as any).title ?? ""),
                description: (r as any).description ?? "",
                thumbnail_url: (r as any).thumbnail_url ?? null,
                video_url: (r as any).video_url ?? null,
                sets: (r as any).sets == null ? null : Number((r as any).sets),
                reps: (r as any).reps == null ? null : Number((r as any).reps),
              })
            )
          );
          await refreshCompletion();
          await loadExerciseProgress();
          return;
        }
      } catch {
        // fall through
      }
      try {
        if (isExerciseApiConfigured()) {
          const apiRows = await fetchExerciseListByModule(moduleId);
          if (apiRows.length > 0) {
            setApiExercises(apiRows.map((ex) => mapToExercise(ex)));
            await refreshCompletion();
            await loadExerciseProgress();
            return;
          }
        }
      } catch {
        // fall through
      }
      const { data: meRows, error: meError } = await supabase
        .from("module_exercise")
        .select("exercise_id, order_index")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });
      if (!meError && meRows?.length) {
        const exIds = meRows.map((r) => r.exercise_id);
        const { data: exRows, error: exError } = await supabase
          .from("exercise")
          .select("exercise_id, title, description, thumbnail_url, video_url, video:video_id(bucket, object_key)")
          .in("exercise_id", exIds)
          .order("exercise_id", { ascending: true });
        if (!exError && exRows?.length) {
          type ExerciseRow = {
            exercise_id: number;
            title: string;
            description: string | null;
            thumbnail_url: string | null;
            video_url: string | null;
            video:
              | { bucket: string; object_key: string }
              | { bucket: string; object_key: string }[]
              | null;
          };
          const ordered = meRows
            .map((me) => exRows.find((e) => e.exercise_id === me.exercise_id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .map((row) => {
              const r = row as ExerciseRow;
              const v = r.video;
              const video = Array.isArray(v) ? (v[0] ?? null) : v ?? null;
              return { ...r, video };
            });
          setApiExercises(
            ordered.map((ex) => {
              let videoUrl = ex.video_url ?? "";
              if (!videoUrl && ex.video?.bucket && ex.video?.object_key) {
                const { data } = supabase.storage.from(ex.video.bucket).getPublicUrl(ex.video.object_key);
                videoUrl = data?.publicUrl ?? "";
              }
              return mapToExercise({ ...ex, video_url: videoUrl });
            })
          );
          await refreshCompletion();
          await loadExerciseProgress();
          return;
        }
      }
      setApiExercises([]);
      await refreshCompletion();
      await loadExerciseProgress();
    } finally {
      setListRefreshing(false);
    }
  }, [sessionId, refreshCompletion, loadExerciseProgress]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <CircularBackButton onPress={() => router.back()} />
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {topBarTitle}
          </Text>
          <View style={{ width: CIRCULAR_BACK_BUTTON_SIZE }} />
        </View>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS === "web" ? undefined : (
              <RefreshControl refreshing={listRefreshing} onRefresh={onRefresh} tintColor="#0D2C2C" />
            )
          }
        >
        <View style={styles.headerBlock}>
          {planInNav ? (
            <>
              <Text style={styles.sessionLabel}>{headerTitle}</Text>
              <Text style={styles.exercisesSectionLabel}>Exercises</Text>
            </>
          ) : null}
          {!planInNav && subtitle ? <Text style={styles.sessionHint}>{subtitle}</Text> : null}
          <View style={styles.accentLine} />
          {moduleIdValid && !apiLoading && exercises.length > 0 && sessionCompleted ? (
            <View style={styles.completeWrap}>
              <Text style={styles.completedBanner}>Session completed</Text>
            </View>
          ) : null}
        </View>

        {!moduleIdValid ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Session not found</Text>
            <Text style={styles.emptySub}>Go back and choose a session from your plan.</Text>
          </View>
        ) : apiLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading exercises…</Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No exercises in this session</Text>
            <Text style={styles.emptySub}>Ask your admin to assign exercises to this module.</Text>
          </View>
        ) : (
          exercises.map((exercise, index) => {
            const thumb = exercise.thumbnail;
            const exerciseImage =
              thumb != null &&
              typeof thumb === "object" &&
              "uri" in thumb &&
              typeof (thumb as { uri: string }).uri === "string" &&
              (thumb as { uri: string }).uri.startsWith("http")
                ? thumb
                : session1Img;
            const position = index + 1;
            const total = exercises.length;
            const unlocked =
              sessionCompleted || isExercisePositionUnlocked(maxCompletedExercisePosition, position);
            const isCurrentExercise =
              !sessionCompleted && unlocked && position === maxCompletedExercisePosition + 1;
            const mediaShell = (
              <View style={sessionCardStyles.mediaShell}>
                <Image
                  source={exerciseImage}
                  style={[sessionCardStyles.mediaImage, !unlocked && styles.imageLocked]}
                  resizeMode="cover"
                />
                {!unlocked ? (
                  <View style={styles.lockOverlay}>
                    <FontAwesome name="lock" size={36} color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={[styles.playCircle, !unlocked && styles.playCircleLocked]}>
                  {unlocked ? (
                    <FontAwesome name="play" size={24} color="#111827" style={styles.playIconNudge} />
                  ) : null}
                </View>
              </View>
            );
            return (
              <TouchableOpacity
                key={exercise.id}
                activeOpacity={0.9}
                style={[
                  isCurrentExercise ? styles.exerciseRowCurrent : sessionCardStyles.tile,
                  index === 0 && styles.listFirstTile,
                  !unlocked && styles.cardLocked,
                ]}
                onPress={() => onExercisePress(exercise, position, total)}
              >
                {isCurrentExercise ? (
                  <View style={sessionCardStyles.mediaElevatedCurrent}>{mediaShell}</View>
                ) : (
                  mediaShell
                )}
                <Text style={sessionCardStyles.caption} numberOfLines={2}>
                  <Text style={sessionCardStyles.captionStrong}>
                    {exercise.title || "Exercise"}
                  </Text>
                </Text>
              </TouchableOpacity>
            );
          })
        )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: FlooraFonts.extraBold,
    fontSize: 24,
    color: colors.brand,
  },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 32 },
  headerBlock: { paddingTop: 12, paddingBottom: 12 },
  sessionLabel: { fontFamily: FlooraFonts.bold, fontSize: 22, color: "#111827" },
  exercisesSectionLabel: {
    fontFamily: FlooraFonts.regular,
    fontSize: 18,
    color: "#111827",
    marginTop: 4,
  },
  sessionHint: { fontFamily: FlooraFonts.medium, fontSize: 15, color: "#64748B", marginTop: 4 },
  /** Matches HomeScreen accent under “Sessions” (light teal, rounded bar). */
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  completeWrap: { marginTop: 16, marginBottom: 4 },
  completedBanner: { fontFamily: FlooraFonts.semiBold, fontSize: 15, color: "#047857" },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  loadingText: { fontFamily: FlooraFonts.regular, marginTop: 8, fontSize: 14, color: "#6B7280" },
  emptyWrap: { paddingVertical: 32, paddingHorizontal: 8, alignItems: "center" },
  emptyTitle: { fontFamily: FlooraFonts.semiBold, fontSize: 16, color: "#374151", textAlign: "center" },
  emptySub: { fontFamily: FlooraFonts.regular, marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center" },
  listFirstTile: { marginTop: 16 },
  /** Matches Home current session — shadow only on thumbnail, not caption. */
  exerciseRowCurrent: {
    marginBottom: 12,
  },
  cardLocked: { opacity: 0.85 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLocked: { opacity: 0.35 },
  playCircle: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  playCircleLocked: { opacity: 0.5 },
  /** Vector icon avoids Poppins rendering "▶" as a tiny glyph (matches pre–global-font look). */
  playIconNudge: { marginLeft: 4 },
});
