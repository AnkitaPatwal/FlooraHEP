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
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { fetchExercises, type ExerciseFromApi } from "../../lib/api";
import colors from "../../constants/colors";

type SessionItem = {
  module_id: number | string;
  title?: string;
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
  sectionSub: {
    fontSize: 16,
    color: colors.brand,
    marginBottom: 12,
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
    resizeMode: "cover",
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
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
  },
  exercisesLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  exercisesLoaderText: {
    fontSize: 14,
    color: "#6B7280",
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
  exerciseCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  exerciseCardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  exerciseCardImagePlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseCardPlaceholderText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  exerciseCardCaption: {
    fontSize: 20,
    color: "#374151",
    marginTop: 10,
    marginBottom: 22,
  },
  exerciseCardCaptionStrong: {
    fontWeight: "800",
    color: "#1F2937",
  },
});

const HomeScreen = () => {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [exercises, setExercises] = useState<ExerciseFromApi[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const email = (global as any)?.userEmail || "keshwa@example.com";

        const { data: userRow, error: userError } = await supabase
          .from("user")
          .select("user_id, fname")
          .eq("email", email)
          .maybeSingle();

        if (userError || !userRow) {
          setError("Unable to load user.");
          setSessions([]);
          return;
        }

        const firstName = (userRow as { fname?: string }).fname?.trim();
        if (firstName) {
          setDisplayName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
        }

        const { data: packageRow, error: packageError } = await supabase
          .from("user_packages")
          .select("package_id")
          .eq("user_id", userRow.user_id)
          .maybeSingle();

        if (packageError || !packageRow) {
          setSessions([]);
          return;
        }

        const { data: planModules, error: planModulesError } = await supabase
          .from("plan_module")
          .select("module_id")
          .eq("plan_id", packageRow.package_id)
          .order("order_index", { ascending: true });

        if (planModulesError || !planModules || planModules.length === 0) {
          setSessions([]);
          return;
        }

        const moduleIds = planModules.map((item: any) => item.module_id);

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

        setSessions(modulesData || []);
      } catch (err) {
        setError("Something went wrong.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSessions();
  }, []);

  useEffect(() => {
    const mapRowToExercise = (r: Record<string, unknown>): ExerciseFromApi => ({
      exercise_id: r.exercise_id as number,
      title: (r.title as string) ?? "",
      description: (r.description as string) ?? null,
      default_sets: (r.default_sets as number) ?? null,
      default_reps: (r.default_reps as number) ?? null,
      body_part: (r.body_part as string) ?? null,
      thumbnail_url: (r.thumbnail_url as string) ?? null,
      video_url: (r.video_url as string) ?? null,
    });

    const loadFromSupabase = async (): Promise<ExerciseFromApi[]> => {
      const { data: rows, error } = await supabase
        .from("exercise")
        .select("exercise_id, title, description, default_sets, default_reps, body_part, thumbnail_url, video_url")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error || !rows?.length) return [];
      return rows.map(mapRowToExercise);
    };

    const loadExercises = async () => {
      setExercisesLoading(true);
      try {
        let list = await fetchExercises();
        if (list.length === 0) list = await loadFromSupabase();
        setExercises(list);
      } catch {
        const list = await loadFromSupabase();
        setExercises(list);
      } finally {
        setExercisesLoading(false);
      }
    };
    loadExercises();
  }, []);

  const goToSession = (id: string, sessionName: string) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: { id, sessionName },
    });
  };

  const goToExercise = (exercise: ExerciseFromApi) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: String(exercise.exercise_id),
        sessionName: exercise.body_part || "Exercise",
        fromApi: "1",
      },
    });
  };

  const currentSession = sessions[0];

  if (loading) {
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            Hi {displayName || "there"}!
          </Text>
          <Text style={styles.brandText}>Floora</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Your Current Session</Text>

        {currentSession ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            goToSession(
              String(currentSession.module_id),
              currentSession.title || "Session 1"
            )
          }
        >
          <View style={styles.card}>
            <Image
              source={require("../../assets/images/current-session.jpg")}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.cardCaption}>
            <Text style={styles.cardCaptionStrong}>{currentSession.title || "Session 1"}</Text>
          </Text>
        </TouchableOpacity>
        ) : (
          <Text style={styles.emptyText}>No assigned sessions yet.</Text>
        )}

        <View style={styles.accentLine} />

        <Text style={[styles.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>Exercises</Text>
        {exercisesLoading ? (
        <View style={styles.exercisesLoader}>
          <ActivityIndicator size="small" color="#0F9AA8" />
          <Text style={styles.exercisesLoaderText}>Loading exercises...</Text>
        </View>
        ) : exercises.length > 0 ? (
          exercises.map((ex) => (
          <TouchableOpacity
            key={ex.exercise_id}
            activeOpacity={0.9}
            onPress={() => goToExercise(ex)}
          >
            <View style={styles.exerciseCard}>
              {ex.video_url ? (
                <Video
                  key={`video-${ex.exercise_id}-${ex.video_url?.slice(-20)}`}
                  source={{ uri: ex.video_url }}
                  style={styles.exerciseCardImage}
                  resizeMode={ResizeMode.COVER}
                  isMuted
                  isLooping
                  shouldPlay
                  useNativeControls={false}
                  onError={(e) => {
                    if (__DEV__) console.warn("Exercise video playback error:", e);
                  }}
                />
              ) : ex.thumbnail_url ? (
                <Image
                  source={{ uri: ex.thumbnail_url }}
                  style={styles.exerciseCardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.exerciseCardImage, styles.exerciseCardImagePlaceholder]}>
                  <Text style={styles.exerciseCardPlaceholderText}>No video</Text>
                </View>
              )}
            </View>
            <Text style={styles.exerciseCardCaption} numberOfLines={1}>
              <Text style={styles.exerciseCardCaptionStrong}>{ex.title}</Text>
              {[ex.body_part, ex.default_sets != null && `${ex.default_sets} sets`, ex.default_reps != null && `${ex.default_reps} reps`].filter(Boolean).length > 0
                ? ` | ${[ex.body_part, ex.default_sets != null && `${ex.default_sets} sets`, ex.default_reps != null && `${ex.default_reps} reps`].filter(Boolean).join(" · ")}`
                : ""}
            </Text>
          </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No exercises yet. Add some from the admin site.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;