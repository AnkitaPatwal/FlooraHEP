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
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type SessionItem = {
  module_id: number | string;
  title?: string;
};

const HomeScreen = () => {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    const email = (global as any)?.userEmail || "";

    if (email) {
      const name = email.split("@")[0];
      setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }, []);

  useEffect(() => {
    const fetchAssignedSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const email = (global as any)?.userEmail || "keshwa@example.com";

        const { data: userRow, error: userError } = await supabase
          .from("user")
          .select("user_id")
          .eq("email", email)
          .maybeSingle();

        if (userError || !userRow) {
          setError("Unable to load user.");
          setSessions([]);
          return;
        }

        const { data: packageRow, error: packageError } = await supabase
          .from("user_packages")
          .select("package_id")
          .eq("user_id", userRow.user_id)
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

        setSessions(modulesData || []);
      } catch (err) {
        setError("Something went wrong.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedSessions();
  }, []);

  const goToSession = (id: string, sessionName: string) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: { id, sessionName },
    });
  };

  const currentSession = sessions[0];
  const previousSessions = sessions.slice(1);

  if (loading) {
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

  if (sessions.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>No assigned sessions yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>
          Hi {displayName || "Loretta"}!
        </Text>
        <Text style={styles.brand}>Floora</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Current Session</Text>

      {currentSession && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.card}
          onPress={() =>
            goToSession(
              String(currentSession.module_id),
              currentSession.title || "Session 1"
            )
          }
        >
          <Image
            source={require("../../assets/images/current-session.jpg")}
            style={styles.cardImage}
          />
          <View style={styles.cardFooter}>
            <Text style={styles.cardTitle}>
              {currentSession.title || "Session 1"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.accentLine} />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Previous Sessions
      </Text>

      {previousSessions.length > 0 ? (
        previousSessions.map((session, index) => (
          <TouchableOpacity
            key={String(session.module_id)}
            activeOpacity={0.9}
            style={styles.card}
            onPress={() =>
              goToSession(
                String(session.module_id),
                session.title || `Session ${index + 2}`
              )
            }
          >
            <Image
              source={require("../../assets/images/prev-1.jpg")}
              style={styles.cardImage}
            />
            <View style={styles.cardFooter}>
              <Text style={styles.cardTitle}>
                {session.title || `Session ${index + 2}`}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No previous sessions.</Text>
      )}
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F9AA8",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginRight: 4,
  },
  accentLine: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#A8CFC9",
    marginTop: 4,
  },
});