// app/screens/_layout.tsx

import React from "react";
import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" />
      <Stack.Screen name="CreateAccount" />
      <Stack.Screen name="ForgotPassword" />
      <Stack.Screen name="ResetPassword" />
      <Stack.Screen name="HomeScreen" />
      <Stack.Screen name="ExerciseGrid" />
      <Stack.Screen name="ExerciseDetail" />
      <Stack.Screen name="RoadMap" />
      <Stack.Screen name="UpdateEmail" />
      <Stack.Screen name="UpdateName" />
    </Stack>
  );
}
