import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import { FlooraFonts } from "../../constants/fonts";
import { CircularIconButton } from "../../components/CircularBackButton";
import defaultProfile from "../../assets/images/default-profile.png";

/** Matches `inputWrapper` so edit chips sit flush with the field row. */
const PROFILE_INPUT_SURFACE = "#F5F5F5";
/** Pencil on the same surface — slightly darker for legibility. */
const PROFILE_EDIT_ICON_COLOR = "#9CA3AF";

type ProfileRecord = {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  fname?: string | null;
  lname?: string | null;
};

/** DB avatar via Edge Function (service role reads profiles + public.user). */
async function fetchAvatarUrlFromUpdateProfile(
  accessToken: string
): Promise<string | null | undefined> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) return undefined;
  try {
    const res = await fetch(`${base}/functions/v1/update-profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as {
      success?: boolean;
      profile?: { avatar_url?: string | null };
    };
    if (!res.ok || data?.success !== true || !data?.profile) return undefined;
    const url = data.profile.avatar_url;
    if (url == null) return null;
    if (typeof url !== "string") return null;
    const t = url.trim();
    return t.length ? t : null;
  } catch {
    return undefined;
  }
}

export default function Profile() {
  const { session } = useAuth();

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasLoadedOnce = useRef(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPendingSuccessMessage = useCallback(() => {
    const pending =
      (globalThis as any).profileSuccessMessage ?? (global as any).profileSuccessMessage;
    if (typeof pending !== "string") return;
    const message = pending.trim();
    if (!message) return;
    (global as any).profileSuccessMessage = "";
    (globalThis as any).profileSuccessMessage = "";
    setError(null);
    setSuccessMessage(message);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId) {
      setError("No authenticated user found.");
      setLoading(false);
      return;
    }

    if (!hasLoadedOnce.current) {
      setLoading(true);
    }

    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      let merged: ProfileRecord = profileData ?? {
        email: userEmail ?? null,
        display_name: null,
        avatar_url: null,
      };

      if (!merged.display_name?.trim() && userEmail) {
        const { data: userRow } = await supabase
          .from("user")
          .select("fname, lname")
          .eq("email", userEmail)
          .maybeSingle();

        if (userRow) {
          merged = { ...merged, fname: userRow.fname, lname: userRow.lname };
        }
      }

      const token = session?.access_token;
      if (token) {
        const apiAvatar = await fetchAvatarUrlFromUpdateProfile(token);
        if (apiAvatar !== undefined) {
          merged = { ...merged, avatar_url: apiAvatar };
        }
      }

      setProfile(merged);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.email, session?.access_token]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      showPendingSuccessMessage();
      void fetchProfile();
    }, [fetchProfile, showPendingSuccessMessage])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const onSignOutPress = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: handleSignOut },
    ]);
  };

  const name =
    profile?.display_name?.trim() ||
    [profile?.fname, profile?.lname].filter(Boolean).join(" ").trim() ||
    session?.user?.email ||
    "—";
  const email = profile?.email || session?.user?.email || "—";
  const avatarUrl = profile?.avatar_url || null;

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
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatar_url: null,
              }
            : prev
        );
        setSuccessMessage("Profile picture removed");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError("Failed to delete photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  const confirmDeleteAvatar = () => {
    Alert.alert(
      "Delete photo",
      "Are you sure you want to delete your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteAvatar },
      ]
    );
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
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : ext === "gif"
          ? "image/gif"
          : "image/jpeg";

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
        setProfile((prev) =>
          prev
            ? { ...prev, avatar_url: url }
            : {
                email: session?.user?.email ?? null,
                display_name: null,
                avatar_url: url,
              }
        );
        setSuccessMessage("Profile picture updated");
        setTimeout(() => setSuccessMessage(null), 3000);
        void fetchProfile();
      }
    } catch {
      setError("Failed to upload photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  const showAvatarOptions = () => {
    const hasAvatar = Boolean(avatarUrl && avatarUrl.trim());

    const options: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }[] = [
      { text: "Change photo", onPress: pickAndUploadAvatar },
      ...(hasAvatar
        ? [
            {
              text: "Delete photo",
              onPress: confirmDeleteAvatar,
              style: "destructive" as const,
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ];

    Alert.alert("Profile picture", "Choose an option", options);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === "web" ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A8E93" />
          )
        }
      >
        <Text style={styles.header}>Profile Settings</Text>
        <View style={styles.headerLine} />

        <TouchableOpacity
          testID="profile-avatar"
          onPress={avatarLoading ? undefined : showAvatarOptions}
          style={[styles.avatarWrap, { minHeight: 44 }]}
          disabled={avatarLoading}
        >
          {avatarLoading ? (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ActivityIndicator size="large" color="#5A8E93" />
            </View>
          ) : avatarUrl ? (
            <Image
              key={avatarUrl}
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <Image source={defaultProfile} style={styles.avatar} />
          )}

          <View style={styles.avatarEditBadge}>
            <Feather name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {successMessage ? (
          <View style={[styles.fieldContainer, styles.messageContainer]}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {error && !loading ? (
          <View style={[styles.fieldContainer, styles.messageContainer]}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void fetchProfile()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#5A8E93" />
            <Text style={styles.statusText}>Loading profile...</Text>
          </View>
        ) : (
          <>
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
                  <CircularIconButton
                    accessibilityLabel="Edit name"
                    style={styles.editIconCircle}
                  >
                    <Feather name="edit-3" size={16} color={PROFILE_EDIT_ICON_COLOR} />
                  </CircularIconButton>
                </Link>
              </View>
            </View>

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
                  <CircularIconButton
                    accessibilityLabel="Edit email"
                    style={styles.editIconCircle}
                  >
                    <Feather name="edit-3" size={16} color={PROFILE_EDIT_ICON_COLOR} />
                  </CircularIconButton>
                </Link>
              </View>
            </View>

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
                  <CircularIconButton
                    accessibilityLabel="Change password"
                    style={styles.editIconCircle}
                  >
                    <Feather name="edit-3" size={16} color={PROFILE_EDIT_ICON_COLOR} />
                  </CircularIconButton>
                </Link>
              </View>
            </View>

            <TouchableOpacity
              testID="profile-sign-out"
              style={styles.signOutButton}
              onPress={onSignOutPress}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
  paddingHorizontal: 0,
  paddingTop: 20,
  paddingBottom: 20,
  flexGrow: 1,
},
  header: {
    fontFamily: FlooraFonts.bold,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 12,
    marginTop: 20,
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
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 40,
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
  statusText: {
    fontFamily: FlooraFonts.regular,
    marginTop: 12,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    fontFamily: FlooraFonts.regular,
    fontSize: 14,
    color: "#B91C1C",
    marginBottom: 8,
    textAlign: "center",
  },
  successText: {
    fontFamily: FlooraFonts.regular,
    fontSize: 14,
    color: "#059669",
    marginBottom: 8,
    textAlign: "center",
  },
  fieldContainer: {
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  messageContainer: {
    marginBottom: 8,
  },
  label: {
    fontFamily: FlooraFonts.semiBold,
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
  },
  inputWrapper: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: PROFILE_INPUT_SURFACE,
  borderRadius: 8,
  paddingRight: 14,
},
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
    color: "#333",
  },
  editIconCircle: {
    marginLeft: 4,
    backgroundColor: PROFILE_INPUT_SURFACE,
    shadowOpacity: 0.06,
    elevation: 2,
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
    minHeight: 44,
    justifyContent: "center",
  },
  signOutText: {
    fontFamily: FlooraFonts.medium,
    color: "#fff",
    fontSize: 16,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "center",
    backgroundColor: "#5A8E93",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  retryButtonText: {
    fontFamily: FlooraFonts.semiBold,
    color: "#fff",
    fontSize: 15,
  },
});
