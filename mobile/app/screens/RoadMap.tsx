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
import { useRoadmap, RoadmapSession } from "../../hooks/useRoadmap";

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
  planName: string;
  onPress: () => void;
};

function SessionCard({ session, index, onPress }: SessionCardProps) {
  const label = session.title || `Session ${index + 1}`;
  const locked = !session.isUnlocked;

  return (
    <Pressable
      style={{ minHeight: 44 }}
      onPress={locked ? undefined : onPress}
      accessible
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityState={{ disabled: locked }}
    >
      <View style={styles.card}>
        <Image
          source={session1Img}
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
  const lockedSessions = (data?.sessions ?? []).filter((s) => !s.isUnlocked);

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
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Roadmap</Text>
        {/* spacer to keep title centered */}
        <View style={{ width: 18 }} />
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
          {/* Plan heading */}
          <Text style={styles.planTitle}>{data.planName}</Text>
          {data.startDate && (
            <Text style={styles.planSub}>{formatStartDate(data.startDate)}</Text>
          )}

          {/* Accent line */}
          <View style={styles.accentLine} />

          {/* Sessions */}
          {lockedSessions.length === 0 ? (
            <Text style={styles.emptyText}>No sessions assigned yet.</Text>
          ) : (
            lockedSessions.map((session, index) => (
              <SessionCard
                key={session.module_id}
                session={session}
                index={index}
                planName={data.planName}
                onPress={() =>
                  router.push({
                    pathname: "/screens/SessionExerciseList",
                    params: {
                      sessionId: String(session.module_id),
                      sessionName: session.title || `Session ${index + 1}`,
                      planName: data.planName,
                      subtitle: "Restore",
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
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
  },

  // Header
  header: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 28,
    color: "#475569",
    width: 18,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  // Titles
  planTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 4,
  },
  planSub: {
    fontSize: 16,
    color: colors.brand,
    marginBottom: 12,
  },
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
  },

  // Card
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  cardImageLocked: {
    opacity: 0.35,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  completedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.brand,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Caption
  caption: {
    fontSize: 20,
    color: "#374151",
    marginTop: 10,
    marginBottom: 22,
  },
  captionStrong: {
    fontWeight: "800",
    color: "#1F2937",
  },
  captionLocked: {
    color: "#9CA3AF",
  },
});
