import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";
import { fetchExerciseById, type ExerciseFromApi } from "../../lib/api";

const ExerciseDetail = () => {
  const { id, sessionName, fromApi } = useLocalSearchParams<{
    id?: string;
    sessionName?: string;
    fromApi?: string;
  }>();
  const router = useRouter();
  const [apiExercise, setApiExercise] = useState<ExerciseFromApi | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const localExercise: Exercise | undefined = useMemo(
    () => EXERCISES.find((ex) => ex.id === String(id ?? "1")),
    [id]
  );

  useEffect(() => {
    if (fromApi !== "1" || !id) return;
    let cancelled = false;
    setApiLoading(true);
    fetchExerciseById(id)
      .then((data) => {
        if (!cancelled) setApiExercise(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiExercise(null);
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromApi, id]);

  const sessionLabel =
    (sessionName as string) ||
    (id ? `Session ${id}` : "Session");

  if (fromApi === "1") {
    if (apiLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F9AA8" />
          <Text style={[styles.notFound, { marginTop: 12 }]}>Loading exercise...</Text>
        </View>
      );
    }
    if (!apiExercise) {
      return (
        <View style={styles.center}>
          <Text style={styles.notFound}>Exercise not found.</Text>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
          >
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const heroSource = apiExercise.thumbnail_url
      ? { uri: apiExercise.thumbnail_url }
      : require("../../assets/images/current-session.jpg");
    const hasVideo = Boolean(apiExercise.video_url?.trim());
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.screen}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>{apiExercise.body_part || "Exercise"}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.sessionRow}>
              <View>
                <Text style={styles.sessionLabel}>{apiExercise.title}</Text>
                <Text style={styles.sessionSub}>
                  {apiExercise.body_part || (apiExercise.default_sets != null && apiExercise.default_reps != null
                    ? `${apiExercise.default_sets} sets × ${apiExercise.default_reps} reps`
                    : "Exercise")}
                </Text>
              </View>
            </View>
            <View style={styles.heroWrapper}>
              {hasVideo ? (
                <Video
                  source={{ uri: apiExercise.video_url! }}
                  style={styles.heroImage}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  shouldPlay={false}
                />
              ) : (
                <>
                  <Image source={heroSource} style={styles.heroImage} />
                  <View style={styles.playButton}>
                    <View style={styles.playTriangle} />
                  </View>
                </>
              )}
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.exerciseTitle}>{apiExercise.title}</Text>
              {apiExercise.body_part && (
                <Text style={styles.categoryText}>{apiExercise.body_part}</Text>
              )}
              <Text style={styles.description}>
                {apiExercise.description || "No description."}
              </Text>
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  const exercise = localExercise;
  if (!exercise) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Exercise not found.</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
        >
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroSource =
    (exercise as any).thumbnail != null
      ? { uri: String((exercise as any).thumbnail) }
      : require("../../assets/images/current-session.jpg");

  // Handle back so it works even 
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <>
      {/* We use our own custom header */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.topTitle}>Leakage</Text>

          {/* spacer */}
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Session info row */}
          <View style={styles.sessionRow}>
            <View>
              {/* dynamic session label */}
              <Text style={styles.sessionLabel}>{sessionLabel}</Text>
              <Text style={styles.sessionSub}>Restore</Text>
            </View>

            <View style={styles.sessionRight}>
              <Text style={styles.progressText}>3/3</Text>
              <View style={styles.dotsRow}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
              </View>
            </View>
          </View>

          {/* Hero image with play button */}
          <View style={styles.heroWrapper}>
            <Image source={heroSource} style={styles.heroImage} />
            <View style={styles.playButton}>
              <View style={styles.playTriangle} />
            </View>
          </View>

          {/* Text block */}
          <View style={styles.textBlock}>
            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
            <Text style={styles.categoryText}>Category</Text>
            <Text style={styles.description}>{exercise.description}</Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default ExerciseDetail;

const COLORS = {
  bg: "#FFFFFF",
  textDark: "#111827",
  textMuted: "#6B7280",
  teal: "#135D66",
  greyDot: "#E5E7EB",
  border: "#F3F4F6",
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topBar: {
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backButton: {
    paddingRight: 6,
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.textDark,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textDark,
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 24,
    paddingBottom: 16,
  },
  sessionLabel: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  sessionSub: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.teal,
  },
  sessionRight: {
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.greyDot,
    marginLeft: 4,
  },
  dotActive: {
    backgroundColor: COLORS.teal,
  },

  heroWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: 260,
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderLeftColor: "#111827",
    borderTopWidth: 12,
    borderTopColor: "transparent",
    borderBottomWidth: 12,
    borderBottomColor: "transparent",
    marginLeft: 4,
  },

  textBlock: {
    marginBottom: 24,
  },
  exerciseTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.teal,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textMuted,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  notFound: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  link: {
    marginTop: 6,
    color: COLORS.teal,
    fontWeight: "500",
  },
});
