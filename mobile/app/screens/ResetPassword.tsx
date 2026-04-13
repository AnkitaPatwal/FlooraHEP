import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenBackButton from "../../components/ScreenBackButton";
import { theme } from "../../constants/theme";

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
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: newPassword }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Reset failed");
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <ScreenBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={styles.headerSpacer} />
      </View>

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
            placeholderTextColor={theme.color.placeholder}
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
            placeholderTextColor={theme.color.placeholder}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerSpacer: {
    width: theme.layout.minTouchTarget,
  },
  headerTitle: {
    ...theme.typography.screenHeaderTitle,
    flex: 1,
    textAlign: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.space.formBodyHorizontal,
    paddingTop: theme.space.formBodyTop,
    paddingBottom: theme.space.formBodyBottom,
  },
  title: {
    ...theme.typography.formPageTitle,
  },
  label: {
    ...theme.typography.formLabel,
  },
  inputContainer: {
    ...theme.form.fieldRow,
    marginBottom: 24,
  },
  input: {
    ...theme.typography.formInput,
    flex: 1,
    paddingVertical: 12,
  },
  button: {
    ...theme.button.primary,
    alignSelf: "stretch",
    marginTop: 8,
  },
  buttonText: {
    ...theme.button.primaryText,
  },
});
