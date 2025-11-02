import React from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from "react-native";
import SessionCard from "../../components/SessionCard";   
import colors from "../../constants/colors";              

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.hi}>Hi Loretta!</Text>

          <Text style={styles.wordmark}>Floora</Text>
        </View>

        <Text style={styles.sectionTitle}>Your Current Session</Text>
        <SessionCard
          title="Session 2"
          subtitle="3 Exercises"
          image={require("../../assets/images/current-session.jpg")}  
        />

        <View style={styles.accentLine} />

        <Text style={styles.sectionTitle}>Previous Sessions</Text>
        <SessionCard
          title="Session 1"
          subtitle="3 Exercises"
          image={require("../../assets/images/prev-1.jpg")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.bg },
  topBar: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between", 
  paddingTop: 4,
  paddingBottom: 12,
},
hi: {
  fontSize: 26,
  fontWeight: "800",
  color: "#0F172A",
},
wordmark: {
  fontSize: 24,
  fontWeight: "800",
  color: colors.brand,
},
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 16, marginBottom: 10 },
  accentLine: { width: 120, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginVertical: 18 },
});
