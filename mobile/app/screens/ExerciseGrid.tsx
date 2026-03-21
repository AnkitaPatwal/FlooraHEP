import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";
import { fetchExerciseList, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { supabase } from "../../lib/supabaseClient";
import { completeSession } from "../../lib/sessionProgress";
import session1Img from "../../assets/images/prev-1.jpg";

type Params = {
  sessionId?: string;
  moduleId?: string;
  sessionName?: string;
  planName?: string;
  subtitle?: string;
};

const ExerciseGrid = () => {
  const router = useRouter();
  const { sessionId, moduleId, sessionName, planName, subtitle } = useLocalSearchParams<Params>();

  const [apiExercises, setApiExercises] = useState<Exercise[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const loadExercises = useCallback(async () => {
      const moduleId = sessionId ? parseInt(String(sessionId), 10) : null;
      if (moduleId && Number.isInteger(moduleId)) {
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
              .filter(Boolean) as { exercise_id: number; title: string; description: string | null; thumbnail_url: string | null; video_url: string | null; video: { bucket: string; object_key: string } | null }[];
            setApiExercises(
              ordered.map((ex) => {
                let videoUrl = ex.video_url ?? "";
                if (!videoUrl && ex.video?.bucket && ex.video?.object_key) {
                  const { data } = supabase.storage.from(ex.video.bucket).getPublicUrl(ex.video.object_key);
                  videoUrl = data?.publicUrl ?? "";
                }
                return {
                  id: String(ex.exercise_id),
                  title: ex.title,
                  description: ex.description ?? "",
                  tags: [],
                  videoSignedUrl: videoUrl,
                  thumbnail: ex.thumbnail_url ?? undefined,
                };
              })
            );
            setApiLoading(false);
            return;
          }
        }
      }
      if (isExerciseApiConfigured()) {
        fetchExerciseList()
          .then((data) => {
            setApiExercises(
              data.map((ex) => ({
                id: String(ex.exercise_id),
                title: ex.title,
                description: ex.description ?? "",
                tags: [],
                videoSignedUrl: ex.video_url ?? "",
              }))
            );
          })
          .catch(() => setApiExercises([]))
          .finally(() => setApiLoading(false));
      } else {
        setApiLoading(false);
      }
    },
  [sessionId]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExercises();
    setRefreshing(false);
  }, [loadExercises]);

  // Check if this session is already completed (e.g. from a previous visit)
  useEffect(() => {
    const checkCompleted = async () => {
      const mid = moduleId ? parseInt(moduleId, 10) : null;
      if (!mid || isNaN(mid)) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_session_completion")
        .select("module_id")
        .eq("user_id", user.id)
        .eq("module_id", mid)
        .maybeSingle();
      setSessionCompleted(!!data);
    };
    checkCompleted();
  }, [moduleId]);

  const effectiveSessionId = sessionId ?? moduleId;

  const exercises: Exercise[] = useMemo(() => {
    if (apiExercises.length > 0) return apiExercises;
    const all = EXERCISES as any[];
    if (!effectiveSessionId) return all;
    const filtered = all.filter((ex) => {
      const exSessionId = ex.sessionId ?? ex.session_id ?? ex.session?.id ?? null;
      return exSessionId != null && String(exSessionId) === String(effectiveSessionId);
    });
    return filtered.length ? filtered : all;
  }, [apiExercises, effectiveSessionId]);

  const handleMarkComplete = async () => {
    const mid = moduleId ? parseInt(moduleId, 10) : null;
    if (mid == null || isNaN(mid)) return;
    setCompleting(true);
    try {
      await completeSession(mid);
      setSessionCompleted(true);
    } finally {
      setCompleting(false);
    }
  };

  const handleExercisePress = (exercise: Exercise) => {
    const videoUrl = (exercise as any).videoSignedUrl;
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: String(exercise.id),
        sessionId: effectiveSessionId ?? sessionId,
        sessionName,
        planName,
        ...(videoUrl ? { videoUrl } : {}),
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: planName || "Leakage",
          headerShown: true,
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBackButton}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              activeOpacity={0.7}
            >
              <Text style={styles.headerBackChevron}>‹</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F9AA8" />
        }
      >
        <View style={styles.headerBlock}>
          {sessionCompleted && (
            <View style={styles.completeBanner}>
              <Text style={styles.completeBannerText}>✓ This session is complete</Text>
            </View>
          )}
          <Text style={styles.sessionLabel}>{sessionName || "Session 1"}</Text>
          <Text style={styles.subtitle}>{subtitle || "Restore"}</Text>
          <View style={styles.accentLine} />
        </View>
        {apiLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading exercises…</Text>
          </View>
        ) : (
          <>
          {moduleId && (
            sessionCompleted ? (
              <View style={[styles.completeButton, styles.completeButtonDone]}>
                <Text style={styles.completeButtonText}>✓ Session completed!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleMarkComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.completeButtonText}>Mark session complete</Text>
                )}
              </TouchableOpacity>
            )
          )}
          {exercises.map((exercise) => {
            const thumb = (exercise as any).thumbnail ?? (exercise as any).image ?? (exercise as any).img;
            const exerciseImage =
              typeof thumb === "string" && thumb.startsWith("http")
                ? { uri: thumb }
                : thumb ?? session1Img;
            return (
              <TouchableOpacity
                key={exercise.id}
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => handleExercisePress(exercise)}
              >
                <View style={styles.imageWrapper}>
                  <Image source={exerciseImage} style={styles.image} resizeMode="cover" />
                  <View style={styles.playCircle}>
                    <Text style={styles.playIcon}>▶</Text>
                  </View>
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.exerciseTitle} numberOfLines={2}>
                    {exercise.title || "Exercise Title"}
                  </Text>
                  {exercise.tags?.[0] && (
                    <Text style={styles.category} numberOfLines={1}>{exercise.tags[0]}</Text>
                  )}
                  {exercise.description && (
                    <Text style={styles.description} numberOfLines={2}>{exercise.description}</Text>
                  )}
                </View>
            </TouchableOpacity>
          );
          })}
          </>
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 32 },
  headerBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginLeft: -4,
  },
  headerBackChevron: {
    fontSize: 28,
    lineHeight: 28,
    color: "#111827",
  },
  headerBlock: { paddingTop: 16, paddingBottom: 12 },
  sessionLabel: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, fontWeight: "600", color: "#0F766E", marginTop: 2 },
  accentLine: { marginTop: 8, width: 80, height: 3, borderRadius: 999, backgroundColor: "#0F766E" },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14, color: "#6B7280" },
  card: {
    marginTop: 16, borderRadius: 22, backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 2, overflow: "hidden",
  },
  imageWrapper: { position: "relative" },
  image: { width: "100%", height: 190 },
  playCircle: {
    position: "absolute", alignSelf: "center", top: "50%", marginTop: -28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center", alignItems: "center",
  },
  playIcon: { fontSize: 22, color: "#111827" },
  textBlock: { paddingHorizontal: 16, paddingVertical: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  category: { fontSize: 15, color: "#0F766E", marginTop: 2, marginBottom: 4 },
  description: { fontSize: 13, color: "#6B7280" },
  completeButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonDone: {
    backgroundColor: "#059669",
  },
  completeBanner: {
    backgroundColor: "#D1FAE5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeBannerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#047857",
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default ExerciseGrid;
