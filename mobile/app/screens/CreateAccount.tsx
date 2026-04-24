import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CircularBackButton } from "../../components/CircularBackButton";
import styles from "./CreateAccount.styles";
import { createClient } from "@supabase/supabase-js";

// Supabase client using environment variables
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_HAS_LETTER = /[A-Za-z]/;
const PASSWORD_HAS_NUMBER = /\d/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function getPasswordError(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (!PASSWORD_HAS_LETTER.test(value) || !PASSWORD_HAS_NUMBER.test(value)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

export default function CreateAccount() {
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address (for example, name@example.com).");
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      Alert.alert("Invalid password", passwordError);
      return;
    }

    const trimmedEmail = email.trim();

    try {
      setLoading(true);

      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/signup`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: trimmedEmail,
          password,
        }),
      });

      const raw = await response.text();
      console.log("Signup Response:", response.status, raw);

      setLoading(false);

      if (!response.ok) {
        let message = raw;
        try {
          const parsed = JSON.parse(raw) as { message?: string; error?: string };
          message = parsed.message || parsed.error || message;
        } catch {
          // keep raw as-is when it's not JSON
        }

        // Nicer copy for the most common validation failure
        if (response.status === 400 && /invalid email/i.test(message)) {
          message = "Invalid email format. Use an address like name@example.com.";
        }
        if (response.status === 400 && /invalid password|password/i.test(message)) {
          message =
            "Invalid password. It must be at least 8 characters long and contain at least one letter and one number.";
        }

        Alert.alert("Signup Failed", message);
        return;
      }

      Alert.alert("Success", "Account created! Pending admin approval.");
      router.back();
    } catch (err: any) {
      setLoading(false);
      console.log("SIGNUP ERROR:", err);
      Alert.alert("Unexpected Error", err.message || "Something went wrong.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.backRow}>
        <CircularBackButton onPress={() => router.back()} />
      </View>

      {/* Title & Subtitle */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Please enter your information below</Text>
      </View>

      {/* First Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>First Name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>

      {/* Last Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email (Username)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Re-enter Password */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Re-enter Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {/* Create Account Button */}
      <TouchableOpacity style={styles.createButton} onPress={handleSignup} disabled={loading}>
        <Text style={styles.createButtonText}>
          {loading ? "Creating..." : "Create Account"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
