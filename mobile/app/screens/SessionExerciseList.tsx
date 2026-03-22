/**
 * Session (Exercise List) — ATH-428
 * Lists exercises for a plan module (session) via module_exercise + exercise.
 * Dashboard and Roadmap navigate here with sessionId + sessionName.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Exercise } from "../../types/exercise";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";
import { supabase } from "../../lib/supabaseClient";
import session1Img from "../../assets/images/prev-1.jpg";

type Params = {
  sessionId?: string;
  sessionName?: string;
  planName?: string;
  subtitle?: string;
};

export default function SessionExerciseList() {
  const router = useRouter();
  const { sessionId, sessionName, planName, subtitle } = useLocalSearchParams<Params>();

  const [apiExercises, setApiExercises] = useState<Exercise[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

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
          title: planName || "Leakage",
          headerShown: true,
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }} hitSlop={10}>
              <Text style={{ fontSize: 24, color: "#111827" }}>‹</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.sessionLabel}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{subtitle || "Restore"}</Text>
          <View style={styles.accentLine} />
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 32 },
  headerBlock: { paddingTop: 16, paddingBottom: 12 },
  sessionLabel: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, fontWeight: "600", color: "#0F766E", marginTop: 2 },
  accentLine: { marginTop: 8, width: 80, height: 3, borderRadius: 999, backgroundColor: "#0F766E" },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14, color: "#6B7280" },
  emptyWrap: { paddingVertical: 32, paddingHorizontal: 8, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", textAlign: "center" },
  emptySub: { marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center" },
  card: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  imageWrapper: { position: "relative" },
  image: { width: "100%", height: 190 },
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
  playIcon: { fontSize: 22, color: "#111827" },
  textBlock: { paddingHorizontal: 16, paddingVertical: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  category: { fontSize: 15, color: "#0F766E", marginTop: 2, marginBottom: 4 },
  description: { fontSize: 13, color: "#6B7280" },
});
