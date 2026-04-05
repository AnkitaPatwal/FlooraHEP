import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "../../constants/theme";
import { useRoadmap } from "../../hooks/useRoadmap";
import SessionCard from "../../components/SessionCard";
import ScreenBackButton from "../../components/ScreenBackButton";
import session1Img from "../../assets/images/prev-1.jpg";

function formatStartDate(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `Started ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function RoadMap() {
  const router = useRouter();
  const { data, loading, error } = useRoadmap();

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

          {(data?.sessions ?? []).map((s, idx) => {
            const state = s.isCompleted
              ? "completed"
              : s.isUnlocked
              ? "available"
              : "locked";

            return (
              <SessionCard
                key={String(s.module_id)}
                title={s.title || `Session ${idx + 1}`}
                exerciseCount={s.exercise_count ?? 0}
                image={session1Img}
                state={state as any}
                onPress={
                  s.isUnlocked
                    ? () =>
                        router.push({
                          pathname: "/screens/SessionExerciseList",
                          params: {
                            sessionId: String(s.module_id),
                            sessionName: s.title || `Session ${idx + 1}`,
                            planName: data?.planName ?? "",
                            subtitle: "Restore",
                          },
                        })
                    : undefined
                }
              />
            );
          })}

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
});