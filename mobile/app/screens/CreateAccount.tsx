import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import styles from "./CreateAccount.styles";
import ScreenBackButton from "../../components/ScreenBackButton";

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
          email,
          password,
        }),
      });

      const raw = await response.text();

      setLoading(false);

      if (!response.ok) {
        Alert.alert("Signup Failed", raw);
        return;
      }

      Alert.alert("Success", "Account created! Pending admin approval.");
      router.back();
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Unexpected Error", err.message || "Something went wrong.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenBackButton variant="onDark" onPress={() => router.back()} style={styles.backButtonContainer} />

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
