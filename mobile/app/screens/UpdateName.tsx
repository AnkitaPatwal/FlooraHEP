import React, { useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

export default function UpdateName() {
  const router = useRouter();
  const [name, setName] = useState("Loretta Barry");

  const handleSubmit = () => {
    console.log("Updated name:", name);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={10} onPress={() => router.push("/profile")}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Name</Text>
        {/* spacer for centering */}
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>Update Name</Text>

        {/* Label */}
        <Text style={styles.label}>New Name</Text>

        {/* Input */}
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter new name"
          placeholderTextColor="#999"
        />

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    color: "#333",
  },

  // Body
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#5E7C7B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    width: 150,
    alignSelf: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
