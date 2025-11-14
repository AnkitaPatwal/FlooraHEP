import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

const HomeScreen = () => {
  const router = useRouter();

  // ✅ accepts BOTH id and sessionName
  const goToSession = (id: string, sessionName: string) => {
    router.push({
      pathname: "/screens/ExerciseDetail",
      params: { id, sessionName },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top header */}
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Hi Loretta!</Text>
        <Text style={styles.brand}>Floora</Text>
      </View>

      {/* Current Session */}
      <Text style={styles.sectionTitle}>Your Current Session</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        // ✅ only ONE onPress, passes correct label
        onPress={() => goToSession("2", "Session 2")}
      >
        <Image
          source={require("../../assets/images/current-session.jpg")}
          style={styles.cardImage}
        />
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle}>Session 2</Text>
          <Text style={styles.cardSubtitle}>3 Exercises</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.accentLine} />

      {/* Previous Sessions */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Previous Sessions
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        // ✅ goes to Session 1 with its own label
        onPress={() => goToSession("1", "Session 1")}
      >
        <Image
          source={require("../../assets/images/prev-1.jpg")}
          style={styles.cardImage}
        />
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle}>Session 1</Text>
          <Text style={styles.cardSubtitle}>3 Exercises</Text>
        </View>
      </TouchableOpacity>
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
  cardSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  accentLine: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#A8CFC9",
    marginTop: 4,
  },
});
