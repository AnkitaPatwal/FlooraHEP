import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";

// TEMP: use same image as roadmap session for all exercises
import session1Img from "../../assets/images/prev-1.jpg";

type Params = {
  sessionId?: string;
  sessionName?: string;
  planName?: string;
  subtitle?: string;
};

const ExerciseGrid = () => {
  const router = useRouter();
  const { sessionId, sessionName, planName, subtitle } =
    useLocalSearchParams<Params>();

  // Get exercises for this session; if none match, show all
  const exercises: Exercise[] = useMemo(() => {
    const all = EXERCISES as any[];

    if (!sessionId) return all;

    const filtered = all.filter((ex) => {
      const exSessionId =
        ex.sessionId ??
        ex.session_id ??
        ex.session?.id ??
        null;

      return (
        exSessionId !== null &&
        String(exSessionId) === String(sessionId)
      );
    });

    return filtered.length ? filtered : all;
  }, [sessionId]);

  const handleExercisePress = (exercise: any) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: String(exercise.id),
        sessionId,
        sessionName,
        planName,
      },
    });
  };

  return (
    <>
      {/* Header with custom back to Roadmap */}
      <Stack.Screen
        options={{
          title: planName || "Leakage",
          headerShown: true,
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 12 }}
              hitSlop={10}
            >
              <Text style={{ fontSize: 24, color: "#111827" }}>‹</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Session header block */}
        <View style={styles.headerBlock}>
          <Text style={styles.sessionLabel}>
            {sessionName || "Session 1"}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle || "Restore"}
          </Text>

          <View style={styles.accentLine} />
        </View>

        {/* Exercise cards */}
        {exercises.map((exercise: any) => {
          const exerciseImage =
            exercise.image ||
            exercise.thumbnail ||
            exercise.img ||
            session1Img;

          return (
            <TouchableOpacity
              key={String(exercise.id)}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => handleExercisePress(exercise)}
            >
              {/* Image with play overlay */}
              <View style={styles.imageWrapper}>
                <Image
                  source={exerciseImage}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View className="play-wrapper" style={styles.playCircle}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
              </View>

              {/* Text block */}
              <View style={styles.textBlock}>
                <Text
                  style={styles.exerciseTitle}
                  numberOfLines={2}
                >
                  {exercise.title ||
                    exercise.name ||
                    "Exercise Title"}
                </Text>

                {exercise.category && (
                  <Text
                    style={styles.category}
                    numberOfLines={1}
                  >
                    {exercise.category}
                  </Text>
                )}

                {exercise.description && (
                  <Text
                    style={styles.description}
                    numberOfLines={2}
                  >
                    {exercise.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Session header
  headerBlock: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  sessionLabel: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F766E",
    marginTop: 2,
  },
  accentLine: {
    marginTop: 8,
    width: 80,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#0F766E",
  },

  // Card
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
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 190,
  },
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
  playIcon: {
    fontSize: 22,
    color: "#111827",
  },
  textBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  category: {
    fontSize: 15,
    color: "#0F766E",
    marginTop: 2,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
  },
});

export default ExerciseGrid;
