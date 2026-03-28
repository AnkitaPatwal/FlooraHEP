import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "../../constants/theme";
import SessionCard from "../../components/SessionCard";
import ScreenBackButton from "../../components/ScreenBackButton";
import session1Img from "../../assets/images/prev-1.jpg";

export default function RoadMap() {
  const router = useRouter();

  const goSession = (sessionId: string, sessionName: string) => {
    router.push({
      pathname: "/screens/SessionExerciseList",
      params: {
        sessionId,
        sessionName,
        planName: "Leakage",
        subtitle: "Restore",
      },
    });
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.planTitle} numberOfLines={2}>
          Leakage Plan
        </Text>
        <Text style={styles.planSub}>Started 10/2/2025</Text>

        <View style={styles.accentLine} />

        <Text style={styles.sectionTitle}>Restore</Text>
        <Text style={styles.sectionSub}>Sessions 1–4</Text>

        <SessionCard
          title="Session 1"
          exerciseCount={3}
          image={session1Img}
          state="current"
          onPress={() => goSession("1", "Session 1")}
        />

        <SessionCard
          title="Session 2"
          exerciseCount={3}
          image={session1Img}
          state="available"
          onPress={() => goSession("2", "Session 2")}
        />

        <SessionCard title="Session 3" exerciseCount={3} image={session1Img} state="locked" />

        <SessionCard
          title="Session 4"
          exerciseCount={2}
          image={session1Img}
          state="completed"
          onPress={() => goSession("4", "Session 4")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.surface,
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
});
