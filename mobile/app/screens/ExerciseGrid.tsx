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
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";
import { fetchExerciseList, isExerciseApiConfigured } from "../../lib/exerciseApi";
import session1Img from "../../assets/images/prev-1.jpg";

type Params = {
  sessionId?: string;
  sessionName?: string;
  planName?: string;
  subtitle?: string;
};

const ExerciseGrid = () => {
  const router = useRouter();
  const { sessionId, sessionName, planName, subtitle } = useLocalSearchParams<Params>();

  const [apiExercises, setApiExercises] = useState<Exercise[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (!isExerciseApiConfigured()) return;
    setApiLoading(true);
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
  }, []);

  const exercises: Exercise[] = useMemo(() => {
    if (apiExercises.length > 0) return apiExercises;
    const all = EXERCISES as any[];
    if (!sessionId) return all;
    const filtered = all.filter((ex) => {
      const exSessionId = ex.sessionId ?? ex.session_id ?? ex.session?.id ?? null;
      return exSessionId != null && String(exSessionId) === String(sessionId);
    });
    return filtered.length ? filtered : all;
  }, [apiExercises, sessionId]);

  const handleExercisePress = (exercise: Exercise) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: { id: String(exercise.id), sessionId, sessionName, planName },
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
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }} hitSlop={10}>
              <Text style={{ fontSize: 24, color: "#111827" }}>‹</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
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
          exercises.map((exercise) => {
            const exerciseImage =
              (exercise as any).image ?? (exercise as any).thumbnail ?? (exercise as any).img ?? session1Img;
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
          })
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 32 },
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
});

export default ExerciseGrid;
