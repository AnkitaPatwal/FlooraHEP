import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import ScreenBackButton from "../../components/ScreenBackButton";
import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabaseClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export default function UpdateEmail() {
  const router = useRouter();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-profile`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();

        if (res.ok && data.success && data.profile) {
          setEmail(data.profile.email ?? "");
        }
      } catch {
        setError("Failed to load current email");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.access_token]);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Invalid email", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-profile`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Update failed", data.message || "Could not update email.");
        return;
      }
      await supabase.auth.refreshSession();
      (global as any).userEmail = trimmed;
      router.back();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <ScreenBackButton onPress={() => router.push("/profile")} />
        <Text style={styles.headerTitle}>Email</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Update Email</Text>
        <Text style={styles.label}>New Email</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#5A8E93" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              testID="update-email-save"
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  input: {
    ...theme.typography.formInput,
    backgroundColor: theme.color.inputFill,
    borderRadius: theme.radius.input,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  errorText: {
    ...theme.typography.errorBanner,
  },
  button: {
    ...theme.button.primary,
    alignSelf: "stretch",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.button.primaryText,
  },
});
