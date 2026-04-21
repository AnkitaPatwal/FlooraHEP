import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlooraFonts } from "../../constants/fonts";

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {

    if (!token) {
      alert("Invalid or missing reset token.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        throw new Error("App configuration is incomplete.");
      }
      const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anon}`,
          apikey: anon,
        },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(data.message || data.error || "Reset failed");
      }

      alert("Password updated. You can now log in.");
      router.replace("/screens/LoginScreen"); 
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 18 }} />
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 18 }} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title}>Set a new password</Text>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#475569"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Updating..." : "Update Password"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontFamily: FlooraFonts.extraBold,
    fontSize: 20,
    color: "#333",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  title: {
    fontFamily: FlooraFonts.bold,
    fontSize: 18,
    textAlign: "center",
    color: "#111827",
    marginBottom: 28,
  },
  label: {
    fontFamily: FlooraFonts.semiBold,
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
    color: "#333",
  },
  button: {
    backgroundColor: "#5A8E93",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    width: 180,
    alignSelf: "center",
  },
  buttonText: {
    fontFamily: FlooraFonts.semiBold,
    color: "#fff",
    fontSize: 16,
  },
});
