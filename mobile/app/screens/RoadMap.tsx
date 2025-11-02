import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import colors from "../../constants/colors";

// use any image you like
import session1Img from "../../assets/images/prev-1.jpg";

export default function RoadMap() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Roadmap</Text>
        {/* spacer to keep title centered */}
        <View style={{ width: 18 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan heading */}
        <Text style={styles.planTitle}>Leakage Plan</Text>
        <Text style={styles.planSub}>Started 10/2/2025</Text>

        {/* Accent line */}
        <View style={styles.accentLine} />

        {/* Section */}
        <Text style={styles.sectionTitle}>Restore</Text>
        <Text style={styles.sectionSub}>Sessions 1-4</Text>

        {/* Session card */}
        <View style={styles.card}>
          <Image source={session1Img} style={styles.cardImage} resizeMode="cover" />
        </View>
        <Text style={styles.caption}>
          <Text style={styles.captionStrong}>Session 1</Text>
          <Text> | 3 Exercises</Text>
        </Text>

        {/* If you want more sessions, duplicate the block above */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
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
    color: colors.brand, // teal subtext
    marginBottom: 12,
  },

  accentLine: {
    width: 150,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.accent, // soft teal line
    marginTop: 6,
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 16,
    color: colors.brand,
    marginBottom: 12,
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
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },

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
});
