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

const MAX_NAME_LENGTH = 100;

export default function UpdateName() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState("");
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
          const fullName =
            data.profile.name ??
            [data.profile.fname, data.profile.lname].filter(Boolean).join(" ").trim();
          setName(fullName || "");
        }
      } catch {
        setError("Failed to load current name");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.access_token]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Invalid name", "Please enter your name.");
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      Alert.alert("Invalid name", `Name must be ${MAX_NAME_LENGTH} characters or less.`);
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
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Update failed", data.message || "Could not update name.");
        return;
      }
      router.back();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <ScreenBackButton onPress={() => router.push("/profile")} />
        <Text style={styles.headerTitle}>Name</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Update Name</Text>
        <Text style={styles.label}>New Name</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#5A8E93" style={{ marginVertical: 24 }} />
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter new name"
              placeholderTextColor="#999"
              maxLength={MAX_NAME_LENGTH}
              editable={!submitting}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
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
  container: {
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
