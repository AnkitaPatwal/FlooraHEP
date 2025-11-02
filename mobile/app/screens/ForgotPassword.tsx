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

  return (
    <ScrollView contentContainerStyle={styles.container}>
  
       
    <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButtonContainer}
        >
        <Ionicons name="chevron-back" size={24} color="#1A3D3C" />
    </TouchableOpacity>


      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Please enter your email to reset your password
        </Text>
      </View>

      {/* Email Field */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton}>
        <Text style={styles.resetButtonText}>Reset Password</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
