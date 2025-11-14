import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";

const ExerciseDetail = () => {
  const { id, sessionName } = useLocalSearchParams<{
    id?: string;
    sessionName?: string;
  }>();
  const router = useRouter();

  // Pick exercise by id; default to "1" if no id passed
  const exercise: Exercise | undefined = useMemo(
    () => EXERCISES.find((ex) => ex.id === String(id ?? "1")),
    [id]
  );

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

  // Session label derived from params; 
  const sessionLabel =
    (sessionName as string) ||
    (id ? `Session ${id}` : "Session");

  // Local hero image 
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
