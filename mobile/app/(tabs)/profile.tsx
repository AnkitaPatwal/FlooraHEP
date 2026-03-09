import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import profilePic from "../../assets/images/profile-pic.png";

type ProfileRecord = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function Profile() {
  const router = useRouter();
  const { session } = useAuth();

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const userEmail = session?.user?.email;

    if (!userEmail) {
      setError("No authenticated user found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("email", userEmail)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [fetchProfile])
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/screens/LoginScreen");
  };

  const onSignOutPress = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: handleSignOut },
    ]);
  };

  const name = profile?.display_name?.trim() || session?.user?.email || "—";
  const email = profile?.email || session?.user?.email || "—";
  const avatarUrl = profile?.avatar_url || null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile Settings</Text>
      <View style={styles.headerLine} />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#5A8E93" />
          <Text style={styles.statusText}>Loading profile...</Text>
        </View>
      ) : (
        <>
          <Image
            source={avatarUrl ? { uri: avatarUrl } : profilePic}
            style={styles.avatar}
          />

          {error ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value="••••••••••"
                editable={false}
                secureTextEntry
                style={styles.input}
              />
              <Link href="/screens/ResetPassword" asChild>
                <TouchableOpacity style={styles.iconContainer}>
                  <Feather name="edit-3" size={18} color="#5A8E93" />
                </TouchableOpacity>
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
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 40,
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    fontSize: 14,
    color: "#B91C1C",
    marginBottom: 8,
    textAlign: "center",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    marginBottom: 30,
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