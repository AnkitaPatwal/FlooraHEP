import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

//Create the RootNavigator
function RootNavigator() {
  //Get the session and isLoading from the AuthContext
  const { session, isLoading } = useAuth();

  //Check if the isLoading is true
  if (isLoading) {
    //Return null
    return null;
  }
  //Return the Stack Navigator with the screen options
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="screens" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
} 
