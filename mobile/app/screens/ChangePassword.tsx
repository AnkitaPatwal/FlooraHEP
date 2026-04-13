import React, { useState, useCallback } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import ScreenBackButton from "../../components/ScreenBackButton";
import { theme } from "../../constants/theme";
import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

const MIN_PASSWORD_LENGTH = 8;

/** Password rules: min length and at least one letter and one number. */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
}

export default function ChangePassword() {
  const router = useRouter();
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const clearForm = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword.trim()) {
      setError("Please enter your current password");
      return;
    }

    const newTrimmed = newPassword.trim();
    const validation = validatePassword(newTrimmed);
    if (!validation.valid) {
      setError(validation.message ?? "Password does not meet requirements");
      return;
    }

    if (newTrimmed !== confirmPassword.trim()) {
      setError("New password and confirmation do not match");
      return;
    }

    const email = session?.user?.email;
    if (!email) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      // Re-authenticate with current password (verifies identity and refreshes session if required)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword.trim(),
      });

      if (signInError) {
        if (signInError.message?.toLowerCase().includes("invalid") || signInError.message?.toLowerCase().includes("credentials")) {
          setError("Current password is incorrect");
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Update password in Supabase (no password stored locally or logged)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newTrimmed,
      });

      if (updateError) {
        setError(updateError.message || "Could not update password. Please try again.");
        return;
      }

      setSuccess(true);
      clearForm();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (success) {
      setSuccess(false);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <ScreenBackButton onPress={handleBack} />
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Update your password</Text>

          {success ? (
            <View style={styles.successBlock}>
              <Feather name="check-circle" size={48} color="#059669" style={styles.successIcon} />
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successText}>Your password has been changed successfully.</Text>
              <TouchableOpacity style={styles.button} onPress={handleBack}>
                <Text style={styles.buttonText}>Back to Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Current password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (error) setError(null);
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel="Current password"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent((s) => !s)}
                  style={styles.eyeButton}
                  accessibilityLabel={showCurrent ? "Hide password" : "Show password"}
                >
                  <Feather name={showCurrent ? "eye-off" : "eye"} size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>New password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (error) setError(null);
                  }}
                  placeholder={`Min ${MIN_PASSWORD_LENGTH} characters, letter and number`}
                  placeholderTextColor="#999"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel="New password"
                />
                <TouchableOpacity
                  onPress={() => setShowNew((s) => !s)}
                  style={styles.eyeButton}
                  accessibilityLabel={showNew ? "Hide password" : "Show password"}
                >
                  <Feather name={showNew ? "eye-off" : "eye"} size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (error) setError(null);
                  }}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  accessibilityLabel="Confirm new password"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                testID="change-password-save"
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Update password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  flex: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  body: {
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
  },
  input: {
    ...theme.typography.formInput,
    flex: 1,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    ...theme.typography.errorBanner,
  },
  button: {
    ...theme.button.primary,
    alignSelf: "stretch",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.button.primaryText,
  },
  successBlock: {
    alignItems: "center",
    paddingVertical: 24,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    ...theme.typography.successTitle,
    textAlign: "center",
  },
  successText: {
    ...theme.typography.body,
    textAlign: "center",
    marginBottom: 24,
  },
});
