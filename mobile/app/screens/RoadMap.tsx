// app/screens/RoadMap.tsx
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import colors from "../../constants/colors";
import { FlooraFonts } from "../../constants/fonts";
import { sessionCardStyles } from "../../constants/sessionCardChrome";
import { useRoadmap, RoadmapSession } from "../../hooks/useRoadmap";
import { CircularBackButton, CIRCULAR_BACK_BUTTON_SIZE } from "../../components/CircularBackButton";

import session1Img from "../../assets/images/prev-1.jpg";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatStartDate(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `Started ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// ── Session Card ──────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: RoadmapSession;
  index: number;
  onPress: () => void;
};

function SessionCard({ session, index, onPress }: SessionCardProps) {
  const label = session.title || `Session ${index + 1}`;
  const locked = !session.isUnlocked;
  const thumb = session.thumbnailUrl;

  return (
    <Pressable
      style={{ minHeight: 44 }}
      onPress={locked ? undefined : onPress}
      accessible
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityState={{ disabled: locked }}
    >
      <View style={sessionCardStyles.tile}>
        <View style={sessionCardStyles.mediaShell}>
          <Image
            source={thumb && thumb.startsWith("http") ? { uri: thumb } : session1Img}
            style={[sessionCardStyles.mediaImage, locked && styles.cardImageLocked]}
            resizeMode="cover"
          />
          {locked && (
            <View style={styles.lockOverlay}>
              <FontAwesome name="lock" size={36} color="#FFFFFF" />
            </View>
          )}
          {session.isCompleted && !locked && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>
        <Text style={[sessionCardStyles.caption, locked && styles.captionLocked]}>
          <Text style={[sessionCardStyles.captionStrong, locked && styles.captionLocked]}>
            {label}
          </Text>
          {locked ? (
            <Text style={[sessionCardStyles.captionMeta, styles.captionLocked]}> | Locked</Text>
          ) : null}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RoadMap() {
  const router = useRouter();
  const { data, loading, error, reload } = useRoadmap();
  const [refreshing, setRefreshing] = React.useState(false);
  const lockedSessions = React.useMemo(() => {
    const list = data?.sessions ?? [];
    return [...list].sort((a, b) => a.order_index - b.order_index);
  }, [data?.sessions]);

  const onRefresh = async () => {
    setRefreshing(true);
    reload();
    // Give the hook a moment to start; refresh control is purely UX.
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <View style={styles.header}>
        <CircularBackButton onPress={() => router.push("/(tabs)")} />
        <View style={styles.headerTitleBlock}>
          {!loading && data?.planName ? (
            <Text style={styles.headerPlanNameHero} numberOfLines={2}>
              {data.planName}
            </Text>
          ) : null}
          <Text
            style={[
              styles.headerScreenLabel,
              !loading && data?.planName ? styles.headerScreenLabelUnderPlan : null,
            ]}
          >
            Roadmap
          </Text>
        </View>
        <View style={{ width: CIRCULAR_BACK_BUTTON_SIZE }} />
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#0F9AA8" />
          <Text style={styles.stateText}>Loading your roadmap…</Text>
        </View>
      )}

      {/* Error */}
      {!loading && error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : null}

      {/* Content */}
      {!loading && !error && data && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F9AA8" />
          }
        >
          {data.startDate ? (
            <Text style={[styles.planSub, styles.planSubInScroll]}>{formatStartDate(data.startDate)}</Text>
          ) : null}

          {/* Accent line */}
          <View style={[styles.accentLine, !data.startDate && styles.accentLineFirst]} />

          {/* Locked sessions only (unlocked sessions live on Home) */}
          {lockedSessions.length === 0 ? (
            <Text style={styles.emptyText}>No locked sessions right now.</Text>
          ) : (
            lockedSessions.map((session, index) => (
              <SessionCard
                key={session.module_id}
                session={session}
                index={index}
                onPress={() =>
                  router.push({
                    pathname: "/screens/SessionExerciseList",
                    params: {
                      sessionId: String(session.module_id),
                      sessionName: session.title || `Session ${index + 1}`,
                    },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  stateText: {
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginTop: 12,
  },
  emptyText: {
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
  },

  // Header
  header: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerScreenLabel: {
    fontFamily: FlooraFonts.semiBold,
    textAlign: "center",
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.2,
  },
  headerScreenLabelUnderPlan: {
    marginTop: 6,
  },
  headerPlanNameHero: {
    fontFamily: FlooraFonts.extraBold,
    fontSize: 30,
    color: colors.brand,
    textAlign: "center",
    lineHeight: 36,
  },

  planSub: {
    fontFamily: FlooraFonts.medium,
    fontSize: 16,
    color: colors.brand,
    marginBottom: 12,
  },
  planSubInScroll: {
    marginTop: 16,
  },
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
  },
  accentLineFirst: {
    marginTop: 16,
  },

  cardImageLocked: {
    opacity: 0.35,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  completedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#6B7280",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 2,
  },
  completedBadgeText: {
    fontFamily: FlooraFonts.extraBold,
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  captionLocked: {
    color: "#9CA3AF",
  },
});
