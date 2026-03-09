/**
  Secure sign-out — unit tests for Profile tab
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Profile from "../profile";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: any) => children,
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: () => {},
}));

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({
    session: {
      access_token: "test-token",
      user: { email: "user@example.com" },
    },
  }),
}));

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

let alertConfirm: (() => void) | null = null;
jest.spyOn(require("react-native").Alert, "alert").mockImplementation(
  (...args: unknown[]) => {
    const buttons = args[2] as Array<{ text: string; onPress?: () => void }> | undefined;
    const signOutButton = buttons?.find((b) => b.text === "Sign out");
    if (signOutButton?.onPress) alertConfirm = signOutButton.onPress;
  }
);

const goodProfile = {
  success: true,
  profile: {
    user_id: 1,
    name: "Jane Doe",
    fname: "Jane",
    lname: "Doe",
    email: "jane@example.com",
  },
};

describe("Profile sign-out (ATH-386/ATH-392)", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("not wrapped in act(...)")) return;
      originalError.apply(console, args);
    };
  });
  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).userEmail = "user@example.com";
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => goodProfile,
    });
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("renders Profile Settings and Sign out button", async () => {
    const { getByText, getByTestId } = render(<Profile />);
    expect(getByText("Profile Settings")).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId("profile-sign-out")).toBeTruthy();
    });
    expect(getByText("Sign out")).toBeTruthy();
  });

  it("calls supabase.auth.signOut and redirects to login when Sign out is pressed", async () => {
    alertConfirm = null;
    const { supabase } = require("../../../lib/supabaseClient");
    const { getByTestId } = render(<Profile />);

    await waitFor(() => {
      expect(getByTestId("profile-sign-out")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-sign-out"));
    expect(alertConfirm).toBeTruthy();
    await alertConfirm!();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect((global as any).userEmail).toBe("");
      expect(mockReplace).toHaveBeenCalledWith("/screens/LoginScreen");
    });
  });
});
