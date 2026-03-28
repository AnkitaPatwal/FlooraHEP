/**
 * Session (Exercise List) — ATH-428
 * Lists exercises for a plan module (session) via module_exercise + exercise.
 * Dashboard and Roadmap navigate here with sessionId + sessionName.
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
} from "react-native";
import ScreenBackButton from "../../components/ScreenBackButton";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Exercise } from "../../types/exercise";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { supabase } from "../../lib/supabaseClient";
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
  const [completeLoading, setCompleteLoading] = useState(false);

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

  useEffect(() => {
    refreshCompletion();
  }, [refreshCompletion]);

  const handleCompleteSession = async () => {
    if (moduleIdNum == null || completeLoading || sessionCompleted) return;
    setCompleteLoading(true);
    try {
      const { error } = await supabase.rpc("complete_user_session", {
        p_module_id: moduleIdNum,
      });
      if (error) {
        Alert.alert("Could not complete", error.message);
        return;
      }
      setSessionCompleted(true);
      Alert.alert("Session complete", "The next session will unlock after the 7-day countdown.");
    } finally {
      setCompleteLoading(false);
    }
  };

  const mapToExercise = (ex: {
    exercise_id: number;
    title: string;
    description?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
  }): Exercise => ({
    id: String(ex.exercise_id),
    title: ex.title,
    description: ex.description ?? "",
    tags: [],
    videoSignedUrl: ex.video_url ?? "",
    thumbnail: ex.thumbnail_url ?? undefined,
  });

  useEffect(() => {
    const loadExercises = async () => {
      const moduleId = sessionId ? parseInt(String(sessionId), 10) : NaN;
      if (!Number.isInteger(moduleId) || moduleId < 1) {
        setApiExercises([]);
        setApiLoading(false);
        return;
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
          const ordered = meRows
            .map((me) => exRows.find((e) => e.exercise_id === me.exercise_id))
            .filter(Boolean) as {
            exercise_id: number;
            title: string;
            description: string | null;
            thumbnail_url: string | null;
            video_url: string | null;
            video: { bucket: string; object_key: string } | null;
          }[];

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

  const handleExercisePress = (exercise: Exercise, positionInSession: number, sessionTotal: number) => {
    const videoUrl = (exercise as { videoSignedUrl?: string }).videoSignedUrl;
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: String(exercise.id),
        sessionId: String(sessionId ?? ""),
        sessionName: headerTitle,
        planName: planName ?? "",
        exercisePosition: String(positionInSession),
        sessionExerciseTotal: String(sessionTotal),
        ...(videoUrl ? { videoUrl } : {}),
      },
    });
  };

  const moduleIdValid = sessionId && Number.isInteger(parseInt(String(sessionId), 10)) && parseInt(String(sessionId), 10) > 0;

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
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.sessionLabel}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{subtitle || "Restore"}</Text>
          <View style={styles.accentLine} />
          {moduleIdValid && !apiLoading && exercises.length > 0 ? (
            <View style={styles.completeWrap}>
              {sessionCompleted ? (
                <Text style={styles.completedBanner}>Session completed</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.completeButton, completeLoading && styles.completeButtonDisabled]}
                  onPress={handleCompleteSession}
                  disabled={completeLoading}
                  activeOpacity={0.85}
                >
                  {completeLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.completeButtonText}>Mark session complete</Text>
                  )}
                </TouchableOpacity>
              )}
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
            const thumb = (exercise as Exercise & { thumbnail?: string }).thumbnail;
            const exerciseImage =
              typeof thumb === "string" && thumb.startsWith("http") ? { uri: thumb } : session1Img;
            const position = index + 1;
            const total = exercises.length;
            return (
              <TouchableOpacity
                key={exercise.id}
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => handleExercisePress(exercise, position, total)}
              >
                <View style={styles.imageWrapper}>
                  <Image source={exerciseImage} style={styles.image} resizeMode="cover" />
                  <View style={styles.playCircle}>
                    <Text style={styles.playIcon}>▶</Text>
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
  imageWrapper: { position: "relative" },
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
