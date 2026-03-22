import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { getUnlockState, getAssignedPlanTitle, type ModuleProgress } from "../../lib/sessionProgress";
import colors from "../../constants/colors";
import { useAuth } from "../../providers/AuthProvider";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.brand,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  progressSummary: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 16,
    color: colors.brand,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    resizeMode: "cover",
  },
  cardCaption: {
    fontSize: 20,
    color: "#374151",
    marginTop: 10,
    marginBottom: 22,
  },
  cardCaptionStrong: {
    fontWeight: "800",
    color: "#1F2937",
  },
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  brandText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2B8C8E",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sessionCardCompleted: {
    opacity: 0.85,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#0F9AA8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

const HomeScreen = () => {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [planName, setPlanName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sessionProgress, setSessionProgress] = useState<ModuleProgress[]>([]);

  const fetchAssignedSessions = useCallback(async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError("");

        if (authLoading) {
          return;
        }

        if (!session?.user?.id) {
          setError("Unable to load user.");
          setSessionProgress([]);
          setLoading(false);
          return;
        }

        const authUserId = session.user.id;
        const email = session.user.email ?? (global as any)?.userEmail ?? "";

        if (email) {
          const { data: userRow, error: userError } = await supabase
            .from("user")
            .select("fname")
            .eq("email", email)
            .maybeSingle();

          if (!userError && userRow) {
            const firstName = (userRow as { fname?: string }).fname?.trim();
            if (firstName) {
              setDisplayName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
            }
          }
        }

        const { data: packageRow, error: packageError } = await supabase
          .from("user_packages")
          .select("package_id")
          .eq("user_id", authUserId)
          .not("package_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (packageError || !packageRow) {
          setSessionProgress([]);
          setPlanName("");
          return;
        }

        // Use RPC to get plan title (bypasses RLS, works without users_read_assigned_plan policy)
        const title = await getAssignedPlanTitle();
        setPlanName(title);

        // Fetch unlock state (ensures Session 1 is unlocked on first visit)
        const progress = await getUnlockState();
        setSessionProgress(progress);
      } catch (err) {
        setError("Something went wrong.");
        setSessionProgress([]);
        setPlanName("");
      } finally {
        if (!isRefresh) setLoading(false);
        setRefreshing(false);
      }
    },
  [session?.user?.id, authLoading]);

  useEffect(() => {
    fetchAssignedSessions();
  }, [fetchAssignedSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignedSessions(true);
  }, [fetchAssignedSessions]);

  const goToSession = (moduleId: string, sessionName: string) => {
    router.push({
      pathname: "/screens/ExerciseGrid",
      params: { moduleId, sessionId: moduleId, sessionName, planName: planName || "Plan" },
    });
  };

  const totalSessions = sessionProgress.length;
  const completedCount = sessionProgress.filter((p) => p.status === "completed").length;

  // Visible sessions = current first, then past (completed) in descending order (4, 3, 2, 1)
  const visibleSessions = sessionProgress
    .filter((p) => p.status === "unlocked" || p.status === "completed")
    .sort((a, b) => {
      if (a.status === "unlocked" && b.status !== "unlocked") return -1;
      if (a.status !== "unlocked" && b.status === "unlocked") return 1;
      if (a.status === "completed" && b.status === "completed") {
        return b.order_index - a.order_index;
      }
      return 0;
    });

  if (authLoading || loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#0F9AA8" />
        <Text style={styles.stateText}>Loading sessions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError("");
            fetchAssignedSessions();
          }}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            Hi {displayName || "there"}!
          </Text>
          <Text style={styles.brandText}>Floora</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F9AA8"
          />
        }
      >
        {planName ? (
          <Text style={styles.planName}>{planName}</Text>
        ) : null}
        <Text style={styles.sectionTitle}>Your Sessions</Text>
        {totalSessions > 0 ? (
          <Text style={styles.progressSummary}>
            {completedCount} of {totalSessions} sessions complete
          </Text>
        ) : null}

        {visibleSessions.length === 0 ? (
          <Text style={styles.emptyText}>No assigned sessions yet.</Text>
        ) : (
          visibleSessions.map((p) => {
            const isCurrent = p.status === "unlocked";
            return (
              <TouchableOpacity
                key={p.module_id}
                activeOpacity={0.9}
                onPress={() => goToSession(String(p.module_id), p.title || `Session ${p.order_index}`)}
                style={p.status === "completed" ? styles.sessionCardCompleted : undefined}
              >
                <View style={styles.card}>
                  <Image
                    source={require("../../assets/images/current-session.jpg")}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.cardCaption}>
                  <Text style={styles.cardCaptionStrong}>{p.title || `Session ${p.order_index}`}</Text>
                  {isCurrent && " (Current)"}
                  {p.status === "completed" && " ✓"}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;