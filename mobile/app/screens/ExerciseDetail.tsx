import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Video, AVPlaybackStatus } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXERCISES } from "../../constants/exercises";
import { Exercise } from "../../types/exercise";
import {
  fetchExerciseById,
  isExerciseApiConfigured,
  type ExerciseApiResponse,
} from "../../lib/exerciseApi";
import { getVideoUiState, type PlaybackState } from "../../lib/playbackState";

const ExerciseDetail = () => {
  const { id, sessionName, videoUrl: paramVideoUrl, exercisePosition, sessionExerciseTotal } =
    useLocalSearchParams<{
      id?: string;
      sessionName?: string;
      fromApi?: string;
      videoUrl?: string;
      exercisePosition?: string;
      sessionExerciseTotal?: string;
    }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [apiExercise, setApiExercise] = useState<ExerciseApiResponse | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  const exerciseId = id ?? "1";
  const tryBackend = isExerciseApiConfigured();

  useEffect(() => {
    if (!tryBackend) {
      setFetchLoading(false);
      return;
    }
    let cancelled = false;
    setFetchError(null);
    setFetchLoading(true);
    fetchExerciseById(exerciseId)
      .then((data) => {
        if (!cancelled) {
          setApiExercise(data ?? null);
          if (data?.video_url) setPlaybackState("loading");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load exercise");
          setApiExercise(null);
        }
      })
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });
    return () => { cancelled = true; };
  }, [tryBackend, exerciseId]);

  const localExercise = useMemo(
    () => EXERCISES.find((ex) => ex.id === String(exerciseId)),
    [exerciseId]
  );

  const displayExercise = useMemo(() => {
    if (apiExercise) {
      return {
        id: String(apiExercise.exercise_id),
        title: apiExercise.title,
        description: apiExercise.description ?? "",
        videoSignedUrl: apiExercise.video_url ?? undefined,
      };
    }
    return localExercise;
  }, [apiExercise, localExercise]);

  const videoUrl =
    apiExercise?.video_url ??
    (typeof paramVideoUrl === "string" && paramVideoUrl.startsWith("http") ? paramVideoUrl : null) ??
    displayExercise?.videoSignedUrl ??
    null;
  const videoUi = getVideoUiState(playbackState, videoError, Boolean(videoUrl));

  useEffect(() => {
    if (videoUrl && playbackState === "idle") setPlaybackState("loading");
  }, [videoUrl, playbackState]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.isBuffering) setPlaybackState("loading");
    else if (status.error) {
      setPlaybackState("error");
      setVideoError(status.error || "Playback error");
    } else {
      setPlaybackState("ready");
      setVideoError(null);
    }
  }, []);

  const handleVideoError = useCallback((error: string) => {
    setPlaybackState("error");
    setVideoError(error);
  }, []);

  const handleVideoRetry = useCallback(() => {
    setVideoError(null);
    setPlaybackState("idle");
    setVideoRetryKey((k) => k + 1);
    if (tryBackend) {
      setFetchLoading(true);
      fetchExerciseById(exerciseId)
        .then((data) => {
          setApiExercise(data ?? null);
          if (data?.video_url) setPlaybackState("loading");
        })
        .catch(() => {})
        .finally(() => setFetchLoading(false));
    }
  }, [tryBackend, exerciseId]);

  const handleVideoPress = useCallback(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [videoUrl]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  if (fetchLoading && !displayExercise) {
    return (
      <View style={[styles.center, styles.screen]}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading exercise…</Text>
      </View>
    );
  }

  if (!displayExercise) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Exercise not found.</Text>
        {fetchError && <Text style={styles.errorText}>{fetchError}</Text>}
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sessionLabel =
    (sessionName as string) || (exerciseId ? `Session ${exerciseId}` : "Session");

  const progressTotalRaw = parseInt(String(sessionExerciseTotal ?? ""), 10);
  const progressPositionRaw = parseInt(String(exercisePosition ?? ""), 10);
  const progressTotal =
    Number.isFinite(progressTotalRaw) && progressTotalRaw > 0 ? progressTotalRaw : 1;
  const progressCurrent =
    Number.isFinite(progressPositionRaw) && progressPositionRaw > 0
      ? Math.min(progressPositionRaw, progressTotal)
      : 1;

  const heroSource =
    (displayExercise as any).thumbnail != null
      ? { uri: String((displayExercise as any).thumbnail) }
      : require("../../assets/images/current-session.jpg");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textDark} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{sessionLabel}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.sessionRow}>
            <View>
              <Text style={styles.sessionLabel}>{sessionLabel}</Text>
              <Text style={styles.sessionSub}>Restore</Text>
            </View>
            <View style={styles.sessionRight}>
              <Text style={styles.progressText}>
                {progressCurrent}/{progressTotal}
              </Text>
              <View style={styles.dotsRow}>
                {Array.from({ length: progressTotal }, (_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i + 1 === progressCurrent ? styles.dotActive : null]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.heroWrapper}>
            {videoUi.showVideo && !videoUi.showErrorFallback ? (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={handleVideoPress}
                activeOpacity={1}
              />
            ) : null}
            {videoUi.showVideo ? (
              <>
                <Video
                  key={videoRetryKey}
                  ref={videoRef}
                  source={{ uri: videoUrl! }}
                  style={styles.heroImage}
                  useNativeControls
                  resizeMode="contain"
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  onError={(e) => handleVideoError((e as { error?: string })?.error ?? "Video failed to load")}
                  onLoad={() => setPlaybackState("loading")}
                />
                {videoUi.showLoadingIndicator && (
                  <View style={styles.videoOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.videoOverlayText}>Loading video…</Text>
                  </View>
                )}
              </>
            ) : (
              <Image source={heroSource} style={styles.heroImage} />
            )}
            {videoUi.showErrorFallback && (
              <View style={styles.videoErrorOverlay}>
                <Text style={styles.videoErrorText}>{videoUi.errorMessage || "Video failed to load"}</Text>
                <Text style={styles.videoErrorHint}>You can still read the instructions below.</Text>
                <TouchableOpacity
                  onPress={handleVideoRetry}
                  style={styles.retryButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!videoUi.showVideo && !videoUi.showErrorFallback && (
              <View style={styles.playButton} pointerEvents="none">
                <View style={styles.playTriangle} />
              </View>
            )}
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.exerciseTitle}>{displayExercise.title}</Text>
            <Text style={styles.categoryText}>Category</Text>
            <Text style={styles.description}>{displayExercise.description}</Text>
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
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    paddingTop: 16, paddingBottom: 10, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  backButton: { flexDirection: "row", alignItems: "center", paddingRight: 12, minWidth: 80 },
  backText: { fontSize: 16, color: COLORS.textDark, marginLeft: 2 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "600", color: COLORS.textDark },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 24, paddingBottom: 16 },
  sessionLabel: { fontSize: 28, fontWeight: "600", color: COLORS.textDark },
  sessionSub: { marginTop: 4, fontSize: 18, fontWeight: "600", color: COLORS.teal },
  sessionRight: { alignItems: "flex-end" },
  progressText: { fontSize: 26, fontWeight: "600", color: COLORS.textDark },
  dotsRow: { flexDirection: "row", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.greyDot, marginLeft: 4 },
  dotActive: { backgroundColor: COLORS.teal },
  heroWrapper: { borderRadius: 16, overflow: "hidden", marginBottom: 24, position: "relative" },
  heroImage: { width: "100%", height: 260 },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  videoOverlayText: { color: "#FFFFFF", marginTop: 8, fontSize: 14 },
  videoErrorOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.8)", padding: 12 },
  videoErrorText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  videoErrorHint: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  retryButton: { marginTop: 8, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.teal, borderRadius: 8 },
  retryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  playButton: {
    position: "absolute", top: "50%", left: "50%", marginLeft: -32, marginTop: -32,
    width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center", alignItems: "center",
  },
  playTriangle: {
    width: 0, height: 0,
    borderLeftWidth: 18, borderLeftColor: "#111827",
    borderTopWidth: 12, borderTopColor: "transparent",
    borderBottomWidth: 12, borderBottomColor: "transparent",
    marginLeft: 4,
  },
  textBlock: { marginBottom: 24 },
  exerciseTitle: { fontSize: 28, fontWeight: "600", color: COLORS.textDark, marginBottom: 4 },
  categoryText: { fontSize: 18, fontWeight: "600", color: COLORS.teal, marginBottom: 16 },
  description: { fontSize: 16, lineHeight: 24, color: COLORS.textMuted },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: COLORS.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  notFound: { fontSize: 14, color: COLORS.textMuted },
  errorText: { marginTop: 8, fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
  link: { marginTop: 6, color: COLORS.teal, fontWeight: "500" },
});
