import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

// Email regex for validation

import { useRouter } from "expo-router";
import styles from "./ForgotPassword.styles";
import { Ionicons } from "@expo/vector-icons";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Call the forgot password API
  const callForgotPasswordApi = async () => {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/forgot-password`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Could not send reset email");
    }
  };

  // Handle the reset password button press
  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Call the forgot password API

    try {
      setLoading(true);
      // Call the forgot password API
      await callForgotPasswordApi();
      // Show the success banner
      setShowSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  // Handle the resend email button press
  const handleResendEmail = async () => {
    await handleResetPassword();
  };

  // Return the JSX
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButtonContainer}
      >
        <Ionicons name="chevron-back" size={24} color="#1A3D3C" />
      </TouchableOpacity>

      {/* header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Please enter your email to reset your password
        </Text>
      </View>

      {/* email field */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (showSuccess) setShowSuccess(false);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter your email"
          placeholderTextColor="#7A7A7A"
          editable={!loading}
        />
      </View>

      {/* success banner shows after pressing reset button */}
      {showSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            If an account with this email exists, a reset link has been sent.
          </Text>
        </View>
      )}

      {/* reset button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.resetButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      {/* resend section - only shown after success */}
      {showSuccess && (
      <View style={styles.resendContainer}>
        <Text style={styles.resendPrompt}>Haven’t got the email yet?</Text>
        <TouchableOpacity onPress={handleResendEmail} disabled={loading}>
          <Text style={styles.resendLink}>Resend email</Text>
        </TouchableOpacity>
      </View>
      )}
    </ScrollView>
  );
}
