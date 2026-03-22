import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView, Platform } from "react-native";
import LoginScreen from "./screens/LoginScreen";

export default function Index() {
  return (
   <SafeAreaView style={{ flex: 1, backgroundColor: "#437C7D" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
       behavior={Platform.OS === "ios" ? "height" : undefined}
      >
        <LoginScreen />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}