import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import styles from "./LoginScreen.styles";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "sessionToken";
const EXP_KEY = "sessionExp";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login if token exists
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const exp = await SecureStore.getItemAsync(EXP_KEY);

      if (!token) return;

      if (exp && Date.now() > Number(exp)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(EXP_KEY);
        return;
      }

      router.replace("/(tabs)");
    })();
  }, []);

  // TEMP login logic
  const handleLogin = async () => {
    setError("");
    setLoading(true);

    // Mock validation
    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    if (!email.endsWith("@csus.edu")) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }

    // Simulated token
    const fakeToken = "mock-session-token";
    const expiresIn = 60 * 60 * 1000; // 1 hour

    await SecureStore.setItemAsync(TOKEN_KEY, fakeToken);
    await SecureStore.setItemAsync(EXP_KEY, String(Date.now() + expiresIn));

    router.replace("/(tabs)");
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/flooraLogo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Health Exercise Program</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {!!error && <Text style={{ marginTop: 8 }}>{error}</Text>}

      <View style={styles.forgotPasswordWrapper}>
        <TouchableOpacity onPress={() => router.push("/screens/ForgotPassword")}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.signInButtonText}>
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </TouchableOpacity>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Don’t have an account?</Text>
        <TouchableOpacity onPress={() => router.push("/screens/CreateAccount")}>
          <Text style={styles.footerLink}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
