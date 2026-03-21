import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import colors from "../../constants/colors";
import { fetchExerciseListByModule, isExerciseApiConfigured } from "../../lib/exerciseApi";

type SessionItem = {
  module_id: number | string;
  title?: string;
  exerciseCount?: number;
};

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
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
    marginBottom: 22,
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
  cardCaptionMeta: {
    color: "#374151",
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
});

const HomeScreen = () => {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    const fetchAssignedSessions = async () => {
      try {
        setLoading(true);
        setError("");

        if (authLoading) {
          return;
        }

        if (!session?.user?.id) {
          setError("Unable to load user.");
          setSessions([]);
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
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (packageError || !packageRow) {
          setSessions([]);
          return;
        }

        const { data: planModules, error: planModulesError } = await supabase
          .from("plan_module")
          .select("module_id")
          .eq("plan_id", packageRow.package_id)
          .order("order_index", { ascending: true });

        if (planModulesError || !planModules || planModules.length === 0) {
          setSessions([]);
          return;
        }

        const moduleIds = planModules.map((item: any) => item.module_id);

        const { data: modulesData, error: modulesError } = await supabase
          .from("module")
          .select("module_id, title")
          .in("module_id", moduleIds)
          .order("module_id", { ascending: true });

        if (modulesError) {
          setError("Failed to load assigned sessions.");
          setSessions([]);
          return;
        }

        let countsByModule: Record<string, number> = {};

        if (isExerciseApiConfigured()) {
          const countEntries = await Promise.all(
            moduleIds.map(async (moduleId: number | string) => {
              try {
                const rows = await fetchExerciseListByModule(moduleId);
                return [String(moduleId), rows.length] as const;
              } catch {
                return [String(moduleId), 0] as const;
              }
            })
          );
          countsByModule = Object.fromEntries(countEntries);
        } else {
          const { data: moduleExerciseRows } = await supabase
            .from("module_exercise")
            .select("module_id, exercise_id")
            .in("module_id", moduleIds);

          countsByModule = (moduleExerciseRows || []).reduce<Record<string, number>>((acc, row: any) => {
            const key = String(row.module_id);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
        }

        const withCounts = (modulesData || []).map((m: any) => ({
          ...m,
          exerciseCount: countsByModule[String(m.module_id)] || 0,
        }));

        setSessions(withCounts);
      } catch (err) {
        setError("Something went wrong.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSessions();
  }, [session?.user?.id, authLoading]);

  const goToSession = (moduleId: string, sessionName: string) => {
    router.push({
      pathname: "/screens/SessionExerciseList",
      params: { sessionId: moduleId, sessionName },
    });
  };

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
      >
        <Text style={styles.sectionTitle}>Your Assigned Sessions</Text>
        <View style={styles.accentLine} />

        {sessions.length > 0 ? (
          sessions.map((sessionItem, index) => (
            <TouchableOpacity
              key={`${sessionItem.module_id}-${index}`}
              activeOpacity={0.9}
              onPress={() =>
                goToSession(
                  String(sessionItem.module_id),
                  sessionItem.title || `Session ${index + 1}`
                )
              }
            >
              <View style={styles.card}>
                <Image
                  source={require("../../assets/images/current-session.jpg")}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.cardCaption}>
                <Text style={styles.cardCaptionStrong}>
                  {sessionItem.title || `Session ${index + 1}`}
                </Text>
                <Text style={styles.cardCaptionMeta}>
                  {` | ${sessionItem.exerciseCount ?? 0} `}
                  {(sessionItem.exerciseCount ?? 0) === 1 ? "Exercise" : "Exercises"}
                </Text>
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No assigned sessions yet.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;