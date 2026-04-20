import React, { useEffect, useMemo } from "react";
import { Text, TextInput } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../providers/AuthProvider";
import { FlooraFonts } from "../constants/fonts";

SplashScreen.preventAutoHideAsync();

declare global {
  // eslint-disable-next-line no-var
  var __flooraFontsDefaulted: boolean | undefined;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      fonts: {
        regular: { fontFamily: FlooraFonts.regular, fontWeight: "400" as const },
        medium: { fontFamily: FlooraFonts.medium, fontWeight: "500" as const },
        bold: { fontFamily: FlooraFonts.semiBold, fontWeight: "600" as const },
        heavy: { fontFamily: FlooraFonts.bold, fontWeight: "700" as const },
      },
    }),
    []
  );

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!global.__flooraFontsDefaulted) {
      global.__flooraFontsDefaulted = true;
      const base = { fontFamily: FlooraFonts.regular };
      const T = Text as unknown as { defaultProps?: { style?: unknown } };
      const TI = TextInput as unknown as { defaultProps?: { style?: unknown } };
      T.defaultProps = T.defaultProps || {};
      T.defaultProps.style = [T.defaultProps.style, base];
      TI.defaultProps = TI.defaultProps || {};
      TI.defaultProps.style = [TI.defaultProps.style, base];
    }
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />

            <Stack.Screen name="screens" />

            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
