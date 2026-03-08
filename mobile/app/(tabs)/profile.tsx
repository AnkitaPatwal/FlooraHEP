import React, { useCallback, useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { Link } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import profilePic from "../../assets/images/profile-pic.png";
import { useAuth } from "../../providers/AuthProvider";

export default function Profile() {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!session?.access_token) return;
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

      if (!res.ok) {
        setError(data.message || "Failed to load profile");
        return;
      }
      if (data.success && data.profile) {
        const fullName =
          data.profile.name ??
          [data.profile.fname, data.profile.lname].filter(Boolean).join(" ").trim();
        setName(fullName || "");
        setEmail(data.profile.email ?? "");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) fetchProfile();
  }, [session?.access_token, fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      if (session?.access_token) fetchProfile();
    }, [session?.access_token, fetchProfile])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Profile Settings</Text>
      <View style={styles.headerLine} />

      {/* Profile Image */}
      <Image source={profilePic} style={styles.avatar} />

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
          <Link href="/screens/ResetPassword" asChild>
            <TouchableOpacity style={styles.iconContainer}>
              <Feather name="edit-3" size={18} color="#5A8E93" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton}>
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
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    marginBottom: 30,
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
