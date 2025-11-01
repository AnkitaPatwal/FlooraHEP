import React from "react";
import { Tabs } from "expo-router";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import colors from "../../constants/colors"; // your brand colors

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,                 // ← icons-only bar
        tabBarActiveTintColor: colors.brand,    // teal active
        tabBarInactiveTintColor: "#94A3B8",     // soft gray
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 10,
          backgroundColor: "#FFF",
          borderTopWidth: 0.5,
          borderTopColor: "#E5E7EB",
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="house.fill" color={color} size={26} />
          ),
        }}
      />

      {/* Plan / Roadmap */}
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="calendar" color={color} size={26} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="person.circle" color={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
