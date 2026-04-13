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
} from "react-native";
import ScreenBackButton from "../../components/ScreenBackButton";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Exercise } from "../../types/exercise";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { supabase } from "../../lib/supabaseClient";
import {
  getMaxCompletedExercisePosition,
  isExercisePositionUnlocked,
} from "../../lib/sessionExerciseProgress";
import { useAuth } from "../../providers/AuthProvider";
import session1Img from "../../assets/images/prev-1.jpg";
import { theme } from "../../constants/theme";
import { fonts } from "../../constants/fonts";
import { stackHeaderScreenOptions } from "../../constants/navigationTheme";

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
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [maxCompletedExercisePosition, setMaxCompletedExercisePosition] = useState(0);

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

  const headerTitle = sessionName || "Session";

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
        planName: planName ?? "",
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
    setApiLoading(true);
    // trigger loadExercises effect by reusing sessionId dependency (no-op) and calling direct loader fallback
    // simplest: just re-run the screen by updating state via route-based key isn't needed; replicate minimal call path.
    // We call the same RPC/API/Supabase sequence by re-invoking load through a local function.
    const moduleId = sessionId ? parseInt(String(sessionId), 10) : NaN;
    if (!Number.isInteger(moduleId) || moduleId < 1) {
      setApiExercises([]);
      setApiLoading(false);
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
        setApiLoading(false);
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
          setApiLoading(false);
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
        setApiLoading(false);
        return;
      }
    }
    setApiExercises([]);
    setApiLoading(false);
  }, [sessionId]);

  return (
    <>
      <Stack.Screen
        options={{
          ...stackHeaderScreenOptions,
          title: planName || "Leakage",
          headerShown: true,
          headerTitleAlign: "center",
          headerLeft: () => <ScreenBackButton onPress={() => router.back()} />,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={apiLoading} onRefresh={onRefresh} tintColor="#0F766E" />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={styles.sessionLabel}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{subtitle || "Restore"}</Text>
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
            <ActivityIndicator size="large" color={theme.color.primary} />
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
            return (
              <TouchableOpacity
                key={exercise.id}
                activeOpacity={0.9}
                style={[styles.card, !unlocked && styles.cardLocked]}
                onPress={() => onExercisePress(exercise, position, total)}
              >
                <View style={styles.imageWrapper}>
                  <Image source={exerciseImage} style={styles.image} resizeMode="cover" />
                  {!unlocked ? (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockOverlayText}>Locked</Text>
                    </View>
                  ) : null}
                  <View style={[styles.playCircle, !unlocked && styles.playCircleLocked]}>
                    <Text style={styles.playIcon}>{unlocked ? "▶" : ""}</Text>
                  </View>
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.exerciseTitle} numberOfLines={2}>
                    {exercise.title || "Exercise"}
                  </Text>
                  {exercise.tags?.[0] ? (
                    <Text style={styles.category} numberOfLines={1}>
                      {exercise.tags[0]}
                    </Text>
                  ) : null}
                  {exercise.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                      {exercise.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.surface },
  contentContainer: {
    paddingHorizontal: theme.space.screenHorizontal,
    paddingBottom: 32,
  },
  headerBlock: { paddingTop: 16, paddingBottom: 12 },
  sessionLabel: {
    ...theme.typography.sessionScreenTitle,
    flexShrink: 1,
  },
  subtitle: {
    ...theme.typography.sectionSubtitle,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  accentLine: {
    marginTop: theme.space.accentLineMarginTop,
    width: theme.layout.accentLineWidth,
    height: theme.layout.accentLineHeight,
    borderRadius: theme.radius.accentBar,
    backgroundColor: theme.color.accent,
    marginBottom: 4,
  },
  completeWrap: { marginTop: 16, marginBottom: 4 },
  completeButton: {
    ...theme.button.primary,
  },
  completeButtonDisabled: { opacity: 0.7 },
  completeButtonText: {
    ...theme.button.primaryText,
  },
  completedBanner: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: theme.color.success,
  },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  loadingText: { marginTop: 8, ...theme.typography.bodySmall },
  emptyWrap: { paddingVertical: 32, paddingHorizontal: 8, alignItems: "center" },
  emptyTitle: {
    ...theme.typography.body,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySub: { marginTop: 8, ...theme.typography.bodySmall, textAlign: "center" },
  card: {
    marginTop: theme.space.sessionTileGap,
    borderRadius: theme.radius.mediaCard,
    backgroundColor: theme.color.surface,
    ...theme.shadow.exerciseCard,
    overflow: "hidden",
  },
  cardLocked: { opacity: 0.7 },
  imageWrapper: { position: "relative" },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockOverlayText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: theme.color.overlayText,
  },
  image: { width: "100%", aspectRatio: 16 / 9 },
  playCircle: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -theme.radius.playOverlay,
    width: theme.radius.playOverlay * 2,
    height: theme.radius.playOverlay * 2,
    borderRadius: theme.radius.playOverlay,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  playCircleLocked: { opacity: 0.5 },
  playIcon: { fontFamily: fonts.regular, fontSize: 22, color: theme.color.heading },
  textBlock: {
    paddingHorizontal: theme.space.screenHorizontal,
    paddingVertical: 12,
  },
  exerciseTitle: {
    ...theme.typography.exerciseTitle,
    flexShrink: 1,
  },
  category: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: theme.color.primary,
    marginTop: 2,
    marginBottom: 4,
  },
  description: {
    ...theme.typography.descriptionCompact,
  },
});
