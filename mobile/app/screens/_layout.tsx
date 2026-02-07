import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const TOKEN_KEY = 'sessionToken';
const EXP_KEY = 'sessionExp';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const exp = await SecureStore.getItemAsync(EXP_KEY);

      // If no token 
      if (!token) {
        router.replace('/screens/LoginScreen');
        return;
      }

      // If expired clear + force login
      if (exp && Date.now() > Number(exp)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(EXP_KEY);
        router.replace('/screens/LoginScreen');
        return;
      }

      setReady(true);
    })();
  }, [router]);

  // Prevent flashing tabs before auth check
  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Your existing config */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />

        {/* Added so /screens/ExerciseDetail works as a stack screen */}
        <Stack.Screen
          name="screens/ExerciseDetail"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
