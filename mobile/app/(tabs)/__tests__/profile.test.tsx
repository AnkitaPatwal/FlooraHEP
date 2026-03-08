/**
 * ATH-386 / ATH-390: Profile info updates — unit tests for Profile tab
 */
import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import Profile from "../profile";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  Link: ({ children, href }: any) => children,
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

const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
  },
}));

describe("Profile (ATH-386/ATH-390)", () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("renders Profile Settings header", () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => goodProfile,
    });

    const { getByText } = render(<Profile />);
    expect(getByText("Profile Settings")).toBeTruthy();
  });

  it("shows loading then name and email after successful fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => goodProfile,
    });

    const { getByText, getByDisplayValue } = render(<Profile />);

    await waitFor(() => {
      expect(getByDisplayValue("Jane Doe")).toBeTruthy();
      expect(getByDisplayValue("jane@example.com")).toBeTruthy();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.supabase.co/functions/v1/update-profile",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("displays name from fname/lname when name field is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: {
          user_id: 1,
          fname: "John",
          lname: "Smith",
          email: "john@example.com",
        },
      }),
    });

    const { getByDisplayValue } = render(<Profile />);

    await waitFor(() => {
      expect(getByDisplayValue("John Smith")).toBeTruthy();
      expect(getByDisplayValue("john@example.com")).toBeTruthy();
    });
  });

  it("shows error when profile fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "User not found" }),
    });

    const { getByText } = render(<Profile />);

    await waitFor(() => {
      expect(getByText("User not found")).toBeTruthy();
    });
  });

  it("renders Sign out button when profile is loaded", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => goodProfile,
    });

    const { getByTestId } = render(<Profile />);

    await waitFor(() => {
      expect(getByTestId("profile-sign-out")).toBeTruthy();
    });
  });
});
