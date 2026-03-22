import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../providers/AuthProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
        {/* Entry */}
        <Stack.Screen name="index" />

        {/* Auth flow (everything under /screens/*) */}
        <Stack.Screen name="screens" />

        {/* Main app */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
    </ErrorBoundary>
  );
}
