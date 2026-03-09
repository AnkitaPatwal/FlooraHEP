import React, { useCallback, useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { Link, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import defaultProfile from "../../assets/images/default-profile.png";
import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../../lib/supabaseClient";

export default function Profile() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const hasLoadedOnce = useRef(false);
  const avatarUrlRef = useRef<string | null>(null);
  avatarUrlRef.current = avatarUrl;

  const fetchProfile = useCallback(async () => {
    if (!session?.access_token) return;
    // Only show loading on first load; keep current UI (including avatar) during refetch
    if (!hasLoadedOnce.current) setLoading(true);
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

      if (!res.ok) {
        setError(data.message || "Failed to load profile");
        return;
      }
      if (data.success && data.profile) {
        hasLoadedOnce.current = true;
        const fullName =
          data.profile.name ??
          [data.profile.fname, data.profile.lname].filter(Boolean).join(" ").trim();
        setName(fullName || "");
        setEmail(data.profile.email ?? "");
        setAvatarUrl(data.profile.avatar_url ?? null);
      }
    } catch {
      setError("Something went wrong");
      // Don't clear avatarUrl on error — preserve current state
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      if (session?.access_token) fetchProfile();
    }, [session?.access_token, fetchProfile])
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    (global as any).userEmail = "";
    router.replace("/screens/LoginScreen");
  };

  const onSignOutPress = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: handleSignOut },
      ]
    );
  };

  const showAvatarOptions = () => {
    const url = avatarUrlRef.current;
    const hasAvatar = Boolean(url && typeof url === "string" && url.trim().length > 0);
    const options: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [
      { text: "Change photo", onPress: pickAndUploadAvatar },
      ...(hasAvatar ? [{ text: "Delete photo", onPress: deleteAvatar, style: "destructive" as const }] : []),
      { text: "Cancel", style: "cancel" },
    ];
    Alert.alert("Profile picture", "Choose an option", options);
  };

  const pickAndUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access photos is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    setAvatarLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const uri = asset.uri;
      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";

      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: `avatar.${ext}`,
        type: mimeType,
      } as any);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            // Do not set Content-Type; fetch sets it with boundary for FormData
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to upload photo");
        return;
      }
      if (data.success) {
        const url = data.avatar_url ?? data.publicUrl ?? null;
        if (url) setAvatarUrl(url);
        setSuccessMessage("Profile picture updated");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError("Failed to upload photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  const deleteAvatar = async () => {
    setAvatarLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "delete" }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to delete photo");
        return;
      }
      if (data.success) {
        setAvatarUrl(null);
        setSuccessMessage("Profile picture removed");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError("Failed to delete photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Profile Settings</Text>
      <View style={styles.headerLine} />

      {/* Profile Image */}
      <TouchableOpacity
        testID="profile-avatar"
        onPress={avatarLoading ? undefined : showAvatarOptions}
        style={styles.avatarWrap}
        disabled={avatarLoading}
      >
        {avatarLoading ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <ActivityIndicator size="large" color="#5A8E93" />
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <Image source={defaultProfile} style={styles.avatar} />
        )}
        <View style={styles.avatarEditBadge}>
          <Feather name="camera" size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      {successMessage ? (
        <View style={styles.fieldContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#5A8E93" />
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={name}
                editable={false}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#999"
              />
              <Link href="/screens/UpdateName" asChild>
                <TouchableOpacity style={styles.iconContainer}>
                  <Feather name="edit-3" size={18} color="#5A8E93" />
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={email}
                editable={false}
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#999"
              />
              <Link href="/screens/UpdateEmail" asChild>
                <TouchableOpacity style={styles.iconContainer}>
                  <Feather name="edit-3" size={18} color="#5A8E93" />
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </>
      )}

      {/* Password */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value="••••••••••"
            editable={false}
            secureTextEntry
            style={styles.input}
          />
          <Link href="/screens/ChangePassword" asChild>
            <TouchableOpacity style={styles.iconContainer}>
              <Feather name="edit-3" size={18} color="#5A8E93" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        testID="profile-sign-out"
        style={styles.signOutButton}
        onPress={onSignOutPress}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 0,
    paddingTop: 60,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  headerLine: {
    height: 1,
    backgroundColor: "#F0F0F0",
    width: "100%",
    marginBottom: 30,
  },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 30,
    position: "relative",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5A8E93",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingRow: {
    paddingHorizontal: 24,
    marginBottom: 18,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: "#059669",
    marginBottom: 8,
    textAlign: "center",
  },
  fieldContainer: {
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
  },
  iconContainer: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -9 }],
  },
  signOutButton: {
    marginTop: 40,
    alignSelf: "center",
    backgroundColor: "#5A8E93",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
