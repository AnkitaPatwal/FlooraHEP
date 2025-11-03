import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import styles from "./CreateAccount.styles";

export default function CreateAccount() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
     {/* Back Arrow */}
    <TouchableOpacity
     onPress={() => router.back()}
     style={styles.backButtonContainer}
    >
  <View style={styles.backButtonCircle}>
    <Ionicons name="chevron-back" size={24} color="#000000" />
  </View>
</TouchableOpacity>


      {/* Title & Subtitle */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Please enter your information below</Text>
      </View>

      {/* First Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>First Name</Text>
        <TextInput style={styles.input} />
      </View>

      {/* Last Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Last Name</Text>
        <TextInput style={styles.input} />
      </View>

      {/* Email */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email (Username)</Text>
        <TextInput style={styles.input} keyboardType="email-address" />
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput style={styles.input} secureTextEntry />
      </View>

      {/* Re-enter Password */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Re-enter Password</Text>
        <TextInput style={styles.input} secureTextEntry />
      </View>

      {/* Create Account Button */}
      <TouchableOpacity style={styles.createButton}>
        <Text style={styles.createButtonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
