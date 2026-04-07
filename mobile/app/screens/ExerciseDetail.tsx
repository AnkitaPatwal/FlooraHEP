import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useEventListener } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
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
import {
  getMaxCompletedExercisePosition,
  recordExerciseWatchedToEnd,
} from "../../lib/sessionExerciseProgress";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import { FlooraFonts } from "../../constants/fonts";
import { sessionCardStyles } from "../../constants/sessionCardChrome";
import { CircularBackButton } from "../../components/CircularBackButton";

type ExerciseVideoPlayerProps = {
  uri: string;
  onPlayToEnd: () => void | Promise<void>;
  onStatus: (state: PlaybackState, errorMessage: string | null) => void;
};

/** expo-video player bound to a single source (parent uses key to reset on retry). */
function ExerciseVideoPlayer({ uri, onPlayToEnd, onStatus }: ExerciseVideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "loading") {
      onStatus("loading", null);
    } else if (status === "readyToPlay") {
      onStatus("ready", null);
    } else if (status === "error") {
      onStatus("error", error?.message ?? "Playback error");
    } else if (status === "idle") {
      onStatus("idle", null);
    }
  });

  useEventListener(player, "playToEnd", () => {
    void onPlayToEnd();
  });

  return (
    <VideoView
      style={sessionCardStyles.detailHeroMedia}
      player={player}
      nativeControls
      contentFit="contain"
    />
  );
}

const ExerciseDetail = () => {
  const { session } = useAuth();
  const {
    id,
    sessionName,
    videoUrl: paramVideoUrl,
    exercisePosition,
    sessionExerciseTotal,
    moduleId,
    sessionId,
    exerciseTitle: exerciseTitleParam,
    exerciseDescription: exerciseDescriptionParam,
    sessionCompleted: sessionCompletedParamRaw,
    sets: setsParam,
    reps: repsParam,
  } = useLocalSearchParams<{
    id?: string;
    sessionName?: string;
    fromApi?: string;
    videoUrl?: string;
    exercisePosition?: string;
    sessionExerciseTotal?: string;
    moduleId?: string;
    sessionId?: string;
    exerciseTitle?: string;
    exerciseDescription?: string;
    sessionCompleted?: string;
    sets?: string;
    reps?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessionCompletionRequestedRef = useRef(false);
  const [apiExercise, setApiExercise] = useState<ExerciseApiResponse | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoRetryKey, setVideoRetryKey] = useState(0);
  const [maxCompletedPosition, setMaxCompletedPosition] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  /** When the list already loaded title/video URL but GET /exercises/:id fails, use params so the screen still works. */
  const displayExercise = useMemo((): Exercise | null => {
    if (apiExercise) {
      return {
        id: String(apiExercise.exercise_id),
        title: apiExercise.title,
        description: apiExercise.description ?? "",
        tags: [],
        videoSignedUrl: apiExercise.video_url ?? "",
      };
    }
    if (localExercise) return localExercise;

    const titleFromRoute =
      typeof exerciseTitleParam === "string" && exerciseTitleParam.trim() !== ""
        ? exerciseTitleParam.trim()
        : "";
    const descFromRoute =
      typeof exerciseDescriptionParam === "string" ? exerciseDescriptionParam : "";
    const paramVideo =
      typeof paramVideoUrl === "string" && paramVideoUrl.startsWith("http") ? paramVideoUrl : "";

    if (titleFromRoute || paramVideo) {
      return {
        id: String(exerciseId),
        title: titleFromRoute || `Exercise ${exerciseId}`,
        description: descFromRoute,
        tags: [],
        videoSignedUrl: paramVideo,
      };
    }
    return null;
  }, [
    apiExercise,
    localExercise,
    exerciseId,
    exerciseTitleParam,
    exerciseDescriptionParam,
    paramVideoUrl,
  ]);

  const videoUrl =
    apiExercise?.video_url ??
    (typeof paramVideoUrl === "string" && paramVideoUrl.startsWith("http") ? paramVideoUrl : null) ??
    (displayExercise?.videoSignedUrl?.startsWith("http") ? displayExercise.videoSignedUrl : null) ??
    null;
  const videoUi = getVideoUiState(playbackState, videoError, Boolean(videoUrl));

  useEffect(() => {
    if (videoUrl && playbackState === "idle") setPlaybackState("loading");
  }, [videoUrl, playbackState]);

  const progressTotalRaw = parseInt(String(sessionExerciseTotal ?? ""), 10);
  const progressPositionRaw = parseInt(String(exercisePosition ?? ""), 10);
  const progressTotal =
    Number.isFinite(progressTotalRaw) && progressTotalRaw > 0 ? progressTotalRaw : 1;
  const progressCurrent =
    Number.isFinite(progressPositionRaw) && progressPositionRaw > 0
      ? Math.min(progressPositionRaw, progressTotal)
      : 1;
  const moduleIdStr = moduleId ?? sessionId;
  const moduleIdNum = useMemo(() => {
    const n = moduleIdStr ? parseInt(String(moduleIdStr), 10) : NaN;
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [moduleIdStr]);

  const sessionCompletedFromPlan = sessionCompletedParamRaw === "1";
  const sets = useMemo(() => {
    const n = parseInt(String(setsParam ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [setsParam]);
  const reps = useMemo(() => {
    const n = parseInt(String(repsParam ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [repsParam]);

  const [sequentialAccess, setSequentialAccess] = useState<"checking" | "allowed" | "denied">(() =>
    sessionCompletedFromPlan || moduleIdNum == null ? "allowed" : "checking"
  );

  useEffect(() => {
    sessionCompletionRequestedRef.current = false;
  }, [exerciseId, moduleIdStr, progressCurrent, progressTotal]);

  const reloadExerciseProgress = useCallback(async () => {
    if (sessionCompletedFromPlan) {
      setMaxCompletedPosition(progressTotal);
      return;
    }
    if (!session?.user?.id || moduleIdNum == null) {
      setMaxCompletedPosition(0);
      return;
    }
    const max = await getMaxCompletedExercisePosition(session.user.id, moduleIdNum);
    setMaxCompletedPosition(max);
  }, [sessionCompletedFromPlan, session?.user?.id, moduleIdNum, progressTotal]);

  useEffect(() => {
    void reloadExerciseProgress();
  }, [reloadExerciseProgress]);

  useEffect(() => {
    if (sessionCompletedFromPlan || moduleIdNum == null || !session?.user?.id) {
      setSequentialAccess("allowed");
      return;
    }
    let cancelled = false;
    (async () => {
      const max = await getMaxCompletedExercisePosition(session.user.id, moduleIdNum);
      if (cancelled) return;
      if (progressCurrent > max + 1) {
        setSequentialAccess("denied");
        Alert.alert("Locked", "Complete the previous exercise in this session first.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        setSequentialAccess("allowed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionCompletedFromPlan, moduleIdNum, session?.user?.id, progressCurrent, router]);

  const completeSessionIfLastRpc = useCallback(async () => {
    if (sessionCompletionRequestedRef.current) return;
    if (moduleIdNum == null || !session?.user?.id) return;
    if (progressCurrent !== progressTotal) return;

    sessionCompletionRequestedRef.current = true;
    const { error } = await supabase.rpc("complete_user_session", {
      p_module_id: moduleIdNum,
    });
    if (error) {
      sessionCompletionRequestedRef.current = false;
      Alert.alert("Could not save progress", error.message);
      return;
    }
    Alert.alert("Session complete", "The next session will unlock soon.");
  }, [moduleIdNum, session?.user?.id, progressCurrent, progressTotal]);

  const handleVideoPlayToEnd = useCallback(async () => {
    if (sessionCompletedFromPlan) {
      return;
    }
    if (!session?.user?.id || moduleIdNum == null) {
      if (progressCurrent === progressTotal) await completeSessionIfLastRpc();
      return;
    }
    const max = await getMaxCompletedExercisePosition(session.user.id, moduleIdNum);
    if (progressCurrent > max + 1) return;
    await recordExerciseWatchedToEnd(session.user.id, moduleIdNum, progressCurrent);
    setMaxCompletedPosition((prev) => Math.max(prev, progressCurrent));
    if (progressCurrent === progressTotal) {
      await completeSessionIfLastRpc();
    }
  }, [
    sessionCompletedFromPlan,
    session?.user?.id,
    moduleIdNum,
    progressCurrent,
    progressTotal,
    completeSessionIfLastRpc,
  ]);

  const handleVideoPlaybackStatus = useCallback((state: PlaybackState, errorMessage: string | null) => {
    setPlaybackState(state);
    setVideoError(errorMessage);
  }, []);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadExerciseProgress();
      setVideoError(null);
      setPlaybackState("idle");
      setVideoRetryKey((k) => k + 1);
      if (tryBackend) {
        setFetchLoading(true);
        try {
          const data = await fetchExerciseById(exerciseId);
          setApiExercise(data ?? null);
          if (data?.video_url) setPlaybackState("loading");
        } catch {
          // keep existing displayExercise
        } finally {
          setFetchLoading(false);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [reloadExerciseProgress, tryBackend, exerciseId]);

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

  if (sequentialAccess === "checking") {
    return (
      <View style={[styles.center, styles.screen]}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (sequentialAccess === "denied") {
    return (
      <View style={[styles.center, styles.screen]}>
        <Text style={styles.notFound}>This exercise is locked.</Text>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sessionLabel =
    (sessionName as string) || (exerciseId ? `Session ${exerciseId}` : "Session");

  const heroSource =
    (displayExercise as any).thumbnail != null
      ? { uri: String((displayExercise as any).thumbnail) }
      : require("../../assets/images/current-session.jpg");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <CircularBackButton onPress={handleBack} />
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor="#0D2C2C" />
          }
        >
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
                {Array.from({ length: progressTotal }, (_, i) => {
                  const n = i + 1;
                  const done = n <= maxCompletedPosition;
                  const current = n === progressCurrent && !done;
                  return (
                    <View
                      key={i}
                      style={[styles.dot, done ? styles.dotActive : null, current ? styles.dotCurrent : null]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          <View style={sessionCardStyles.detailHero}>
            {videoUi.showVideo ? (
              <>
                <ExerciseVideoPlayer
                  key={`${videoUrl}-${videoRetryKey}`}
                  uri={videoUrl!}
                  onPlayToEnd={handleVideoPlayToEnd}
                  onStatus={handleVideoPlaybackStatus}
                />
                {videoUi.showLoadingIndicator && (
                  <View style={styles.videoOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.videoOverlayText}>Loading video…</Text>
                  </View>
                )}
              </>
            ) : (
              <Image source={heroSource} style={sessionCardStyles.detailHeroMedia} />
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
            {sets != null || reps != null ? (
              <Text style={styles.prescriptionText}>
                {sets != null ? `${sets} sets` : ""}
                {sets != null && reps != null ? " • " : ""}
                {reps != null ? `${reps} reps` : ""}
              </Text>
            ) : null}
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
  topBarSpacer: { flex: 1 },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  sessionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 24, paddingBottom: 16 },
  sessionLabel: { fontFamily: FlooraFonts.semiBold, fontSize: 28, color: COLORS.textDark },
  sessionSub: { fontFamily: FlooraFonts.semiBold, marginTop: 4, fontSize: 20, color: COLORS.teal },
  sessionRight: { alignItems: "flex-end" },
  progressText: { fontFamily: FlooraFonts.semiBold, fontSize: 26, color: COLORS.textDark },
  dotsRow: { flexDirection: "row", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.greyDot, marginLeft: 4 },
  dotActive: { backgroundColor: COLORS.teal },
  dotCurrent: {
    borderWidth: 2,
    borderColor: COLORS.teal,
    backgroundColor: "#FFFFFF",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  videoOverlayText: { fontFamily: FlooraFonts.regular, color: "#FFFFFF", marginTop: 8, fontSize: 14 },
  videoErrorOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.8)", padding: 12 },
  videoErrorText: { fontFamily: FlooraFonts.semiBold, color: "#FFFFFF", fontSize: 14 },
  videoErrorHint: { fontFamily: FlooraFonts.regular, color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  retryButton: { marginTop: 8, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.teal, borderRadius: 8 },
  retryButtonText: { fontFamily: FlooraFonts.semiBold, color: "#FFFFFF", fontSize: 14 },
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
  exerciseTitle: { fontFamily: FlooraFonts.bold, fontSize: 28, color: COLORS.textDark, marginBottom: 4 },
  prescriptionText: { fontFamily: FlooraFonts.semiBold, fontSize: 16, color: COLORS.textDark, marginBottom: 10 },
  description: { fontFamily: FlooraFonts.regular, fontSize: 16, lineHeight: 24, color: COLORS.textMuted },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: COLORS.bg },
  loadingText: { fontFamily: FlooraFonts.regular, marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  notFound: { fontFamily: FlooraFonts.regular, fontSize: 14, color: COLORS.textMuted },
  errorText: { fontFamily: FlooraFonts.regular, marginTop: 8, fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
  link: { fontFamily: FlooraFonts.medium, marginTop: 6, color: COLORS.teal },
});
