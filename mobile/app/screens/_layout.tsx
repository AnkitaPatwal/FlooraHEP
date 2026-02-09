// app/screens/_layout.tsx

<<<<<<< HEAD
import { useColorScheme } from '@/hooks/use-color-scheme';

//Create the unstable_settings
export const unstable_settings = {
  anchor: '(tabs)',
};

//Create the RootLayout
export default function RootLayout() {
  const colorScheme = useColorScheme();
  //Return the ThemeProvider with the Stack
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
        <Stack.Screen
          name="screens/ExerciseDetail"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
=======
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
>>>>>>> 0a4e0ef (Supabase auth, protected routes, and login flow)
  );
}
