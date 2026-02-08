//LoginScreen.tsx
import React, { useState } from "react";

import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from "react-native";
import styles from "./LoginScreen.styles";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

//Email regex for validation  
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//Create the LoginScreen
export default function LoginScreen() {
  //Get the router from the useRouter hook
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

  //Create the handleSignIn function
  const handleSignIn = async () => {
    //Get the trimmed email from the email state
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }
    //Check if the email is valid
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    //Check if the password is empty
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
      // Account exists and is approved — sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail.toLowerCase(),
        password,
      });
      if (error) {
        Alert.alert("Sign In Failed", error.message ?? "Invalid email or password.");
        setLoading(false);
        return;
      }
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
