import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../../constants/theme";
import ScreenBackButton from "../../components/ScreenBackButton";
import { useRoadmap, RoadmapSession } from "../../hooks/useRoadmap";
import { supabase } from "../../lib/supabaseClient";

import session1Img from "../../assets/images/prev-1.jpg";

function formatStartDate(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `Started ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatUnlockDate(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ── Session Card ──────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: RoadmapSession;
  index: number;
  planName: string;
  onPress: () => void;
  onLockedPress?: () => void;
  thumbnailUrl?: string;
};

function SessionCard({ session, index, onPress, onLockedPress, thumbnailUrl }: SessionCardProps) {
  const label = session.title || `Session ${index + 1}`;
  const locked = !session.isUnlocked;

  return (
    <Pressable
      style={{ minHeight: 44 }}
      onPress={locked ? onLockedPress : onPress}
      accessible
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityHint={locked ? "Shows when this session unlocks." : undefined}
    >
      <View style={styles.card}>
        <Image
          source={thumbnailUrl && thumbnailUrl.startsWith("http") ? { uri: thumbnailUrl } : session1Img}
          style={[styles.cardImage, locked && styles.cardImageLocked]}
          resizeMode="cover"
        />
        {locked && (
          <View style={styles.lockOverlay}>
            <FontAwesome name="lock" size={36} color="#FFFFFF" />
          </View>
        )}
        {session.isCompleted && !locked && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ Done</Text>
          </View>
        )}
      </View>

      <Text style={[styles.caption, locked && styles.captionLocked]}>
        <Text style={[styles.captionStrong, locked && styles.captionLocked]}>
          {label}
        </Text>
        {locked ? <Text> | Locked</Text> : null}
      </Text>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RoadMap() {
  const router = useRouter();
  const { data, loading, error, reload } = useRoadmap();
  const [refreshing, setRefreshing] = React.useState(false);
  const [sessionThumbs, setSessionThumbs] = React.useState<Record<string, string>>({});
  const lockedSessions = (data?.sessions ?? []).filter((s) => !s.isUnlocked);
  const showLockedUnlockAlert = React.useCallback((title: string, unlockDate: string | null) => {
    const unlockOn = formatUnlockDate(unlockDate);
    Alert.alert(
      "Session Locked",
      unlockOn
        ? `${title} is locked until ${unlockOn}.`
        : `${title} is locked. The session will unlock soon.`
    );
  }, []);

  React.useEffect(() => {
    const loadThumbs = async () => {
      if (lockedSessions.length === 0) return;
      try {
        const entries = await Promise.all(
          lockedSessions.map(async (s) => {
            const { data: rows, error: rpcErr } = await supabase.rpc(
              "get_current_assigned_session_exercises",
              { p_module_id: Number(s.module_id) }
            );
            if (rpcErr || !Array.isArray(rows) || rows.length === 0) {
              return [String(s.module_id), ""] as const;
            }
            const thumb = String((rows[0] as any)?.thumbnail_url ?? "");
            return [String(s.module_id), thumb] as const;
          })
        );
        setSessionThumbs((prev) => {
          const next = { ...prev };
          for (const [mid, url] of entries) {
            if (url && url.startsWith("http")) next[mid] = url;
          }
          return next;
        });
      } catch {
        // non-blocking
      }
    };
    void loadThumbs();
  }, [lockedSessions]);

  const onRefresh = async () => {
    setRefreshing(true);
    reload();
    // Give the hook a moment to start; refresh control is purely UX.
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ScreenBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          Roadmap
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.color.primary} />
          <Text style={styles.stateText}>Loading your roadmap…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            Platform.OS === "web" ? undefined : (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F9AA8" />
            )
          }
        >
          <Text style={styles.planTitle} numberOfLines={2}>
            {data?.planName || "Your care plan"}
          </Text>

          {data?.startDate ? (
            <Text style={styles.planSub}>{formatStartDate(data.startDate)}</Text>
          ) : null}

          <View style={styles.accentLine} />

          <Text style={styles.sectionTitle}>Restore</Text>
          <Text style={styles.sectionSub}>
            {data?.sessions?.length ? `Sessions 1–${data.sessions.length}` : "No sessions assigned yet"}
          </Text>

          {(data?.sessions ?? []).map((s, idx) => (
            <SessionCard
              key={String(s.module_id)}
              session={s}
              index={idx}
              planName={data?.planName ?? ""}
              thumbnailUrl={sessionThumbs[String(s.module_id)]}
              onLockedPress={
                s.isUnlocked
                  ? undefined
                  : () =>
                      showLockedUnlockAlert(
                        s.title || `Session ${idx + 1}`,
                        s.unlockDate
                      )
              }
              onPress={() =>
                router.push({
                  pathname: "/screens/SessionExerciseList",
                  params: {
                    sessionId: String(s.module_id),
                    sessionName: s.title || `Session ${idx + 1}`,
                    planName: data?.planName ?? "",
                    subtitle: "Restore",
                  },
                })
              }
            />
          ))}

          {(data?.sessions?.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>No sessions assigned yet.</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  header: {
    minHeight: theme.space.headerRowHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.space.screenHorizontal,
    backgroundColor: theme.color.surface,
  },
  headerTitle: {
    ...theme.typography.screenHeaderTitle,
    flex: 1,
    textAlign: "center",
    minWidth: 0,
  },
  headerSpacer: {
    width: theme.layout.minTouchTarget,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  scrollContent: {
    paddingHorizontal: theme.space.screenHorizontal,
    paddingTop: theme.space.screenTop,
    paddingBottom: theme.space.scrollBottom,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: theme.color.surface,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space.formBodyHorizontal,
  },
  stateText: {
    ...theme.typography.body,
    textAlign: "center",
  },
  planTitle: {
    ...theme.typography.planTitle,
    marginBottom: 4,
  },
  planSub: {
    ...theme.typography.planSubtitle,
    marginBottom: 12,
  },
  accentLine: {
    width: theme.layout.accentLineWidth,
    height: theme.layout.accentLineHeight,
    borderRadius: theme.radius.accentBar,
    backgroundColor: theme.color.accent,
    marginTop: theme.space.accentLineMarginTop,
    marginBottom: theme.space.accentLineMarginBottom,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    marginBottom: theme.space.sectionTitleBottom,
  },
  sectionSub: {
    ...theme.typography.sectionSubtitle,
    marginBottom: 12,
  },
  emptyText: {
    ...theme.typography.bodySmall,
    color: theme.color.muted,
    marginTop: 6,
  },
  card: {
    borderRadius: theme.radius.card,
    overflow: "hidden",
    backgroundColor: theme.color.surface,
    marginBottom: theme.space.sessionTileGap,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  cardImageLocked: {
    opacity: theme.session.lockedOpacity,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.color.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 12,
    color: theme.color.overlayText,
    fontWeight: "700",
  },
  caption: {
    ...theme.typography.cardCaption,
    marginTop: theme.space.cardCaptionTop,
    marginBottom: theme.space.cardCaptionBottom,
  },
  captionStrong: {
    ...theme.typography.cardCaptionStrong,
  },
  captionLocked: {
    color: theme.color.muted,
  },
});