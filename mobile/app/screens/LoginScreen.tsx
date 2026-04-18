// LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import styles from "./LoginScreen.styles";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabaseClient";

// Email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmailExists = async (): Promise<{
    exists: boolean;
    approved?: boolean;
  }> => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!baseUrl || !anonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const url = `${baseUrl}/functions/v1/check-email-exists`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
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

      const normalizedEmail = trimmedEmail.toLowerCase();

      // account existence and approval (ATH-94)
      const { exists, approved } = await validateEmailExists();

      if (!exists) {
        Alert.alert(
          "No Account Found",
          "No account exists with this email. Request an account to get started."
        );
        return;
      }

      const approvedOk = approved === true || approved === "true";
      if (!approvedOk) {
        Alert.alert("Account Pending", "Your account is pending admin approval.");
        return;
      }

      // Only approved users reach Supabase Auth login (check-email-exists may sync Auth from public.user)
      let { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      const errCode = (error as { code?: string } | null)?.code;
      if (
        error &&
        errCode === "invalid_credentials" &&
        password.trim() !== password
      ) {
        ({ data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password.trim(),
        }));
      }

      if (data?.session && !error) {
        Keyboard.dismiss();
        // Store logged-in email globally
        (global as any).userEmail = normalizedEmail;
        router.replace("/(tabs)");
        return;
      }

      const finalCode = (error as { code?: string } | null)?.code;
      const hint =
        finalCode === "invalid_credentials"
          ? "Invalid email or password. If you were approved recently, use the password from sign-up, try Forgot Password, or ask your clinic to confirm your account email matches this app."
          : error?.message || "Invalid email or password.";
      Alert.alert("Sign In Failed", hint);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
    >
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
        <TouchableOpacity
          onPress={() => router.push("/screens/ForgotPassword")}
          disabled={loading}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={[styles.signInButton, { minHeight: 44, justifyContent: "center" }]}
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
        <TouchableOpacity
          onPress={() => router.push("/screens/CreateAccount")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.footerLink}>Request Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}