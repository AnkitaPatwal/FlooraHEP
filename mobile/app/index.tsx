import React from "react";
import LoginScreen from "./screens/LoginScreen";

export default function Index() {
  // Entry screen of the app: show Login.
  // After a successful login, navigate to /(tabs)/home from inside LoginScreen.
  return <LoginScreen />;
}
