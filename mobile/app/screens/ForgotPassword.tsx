import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import styles from "./ForgotPassword.styles";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleResetPassword = () => {
    // FILL IN WITH RESET LOGIC LATER
    setShowSuccess(true);
  };

  const handleResendEmail = () => {
    // FILL IN WITH RESET LOGIC LATER
    console.log("Resend email pressed");
    setShowSuccess(true);
  };

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
            if (showSuccess) setShowSuccess(false); //banner hides if user edits 
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter your email"
          placeholderTextColor="#7A7A7A"
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
      <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
        <Text style={styles.resetButtonText}>Reset Password</Text>
      </TouchableOpacity>

      {/* resend section WIP */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendPrompt}>Haven’t got the email yet?</Text>
        <TouchableOpacity onPress={handleResendEmail}>
          <Text style={styles.resendLink}>Resend email</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
