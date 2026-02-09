// app/(tabs)/_layout.tsx

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../providers/AuthProvider";

export default function TabsLayout() {
  const { session, loading } = useAuth();

  // While checking auth, show loader (prevents blank screen)
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // If not signed in, redirect (no useEffect loops)
  if (!session) {
    return <Redirect href="/screens/LoginScreen" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#007AFF", // iOS blue
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          borderTopColor: "#E5E7EB",
          borderTopWidth: 1,
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: "Roadmap",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
