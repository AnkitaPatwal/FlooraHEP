import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import styles from "./LoginScreen.styles";
import { useRouter } from "expo-router"; 

export default function LoginScreen() {
  const router = useRouter(); 

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
        <TextInput style={styles.input} />
      </View>

      {/* Password Field */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput style={styles.input} secureTextEntry />
      </View>

      {/* Forgot Password */}
      <View style={styles.forgotPasswordWrapper}>
      <TouchableOpacity onPress={() => router.push("/screens/ForgotPassword")}>
      <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>
     </View>


      {/*Sign In Button */}
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => router.replace("/(tabs)")} // navigate to home tabs
      >
        <Text style={styles.signInButtonText}>Sign In</Text>
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
