//LoginScreen.tsx
import React, { useState } from "react";

import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import styles from "./LoginScreen.styles";
import { useRouter } from "expo-router";

//Email regex for validation  
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmailExists = async (): Promise<{ exists: boolean; approved?: boolean }> => {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/check-email-exists`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not verify account");
    }
    return { exists: !!data.exists, approved: data.approved };
  };

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!password) {
      Alert.alert("Missing Password", "Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const { exists, approved } = await validateEmailExists();
      if (!exists) {
        Alert.alert(
          "No Account Found",
          "No account exists with this email. Request an account to get started."
        );
        setLoading(false);
        return;
      }
      if (approved === false) {
        Alert.alert(
          "Account Pending",
          "Your account is pending admin approval."
        );
        setLoading(false);
        return;
      }
      // Account exists and is approved — proceed to sign in 
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo and Subtitle */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/flooraLogo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Health Exercise Program</Text>
      </View>

      {/* Email Field */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
      </View>

      {/* Password Field */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#888"
          editable={!loading}
        />
      </View>

      {/* Forgot Password */}
      <View style={styles.forgotPasswordWrapper}>
        <TouchableOpacity onPress={() => router.push("/screens/ForgotPassword")} disabled={loading}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.signInButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>Don’t have an account?</Text>
      <TouchableOpacity onPress={() => router.push("/screens/CreateAccount")}>
        <Text style={styles.footerLink}>Request Account</Text>
      </TouchableOpacity>
    </View>

    </ScrollView>
  );
}
