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
        <TouchableOpacity hitSlop={10} onPress={() => router.push("/profile")}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email</Text>
        <View style={{ width: 18 }} />
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
    backgroundColor: "#FFFFFF",
  },
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
  body: {
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
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#5A8E93",
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
