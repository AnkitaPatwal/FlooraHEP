/**
 Profile info updates — unit tests for UpdateEmail screen
 */
import React from "react";
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import UpdateEmail from "../UpdateEmail";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({
    session: { access_token: "test-token", user: { email: "user@example.com" } },
  }),
}));

const mockRefreshSession = jest.fn().mockResolvedValue({ data: {}, error: null });

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      refreshSession: mockRefreshSession,
    },
  },
}));

describe("UpdateEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    jest.spyOn(require("react-native").Alert, "alert").mockImplementation(() => {});
  });

  it("renders Update Email title and loads current email", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { email: "jane@example.com" },
      }),
    });

    const { getByText, getByDisplayValue } = render(<UpdateEmail />);

    expect(getByText("Update Email")).toBeTruthy();

    await waitFor(() => {
      expect(getByDisplayValue("jane@example.com")).toBeTruthy();
    });
  });

  it("shows alert when email is empty", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, profile: { email: "jane@example.com" } }),
    });

    const { getByDisplayValue, getByText } = render(<UpdateEmail />);

    await waitFor(() => {
      expect(getByDisplayValue("jane@example.com")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("jane@example.com"), "");
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid email",
      "Please enter your email address."
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows alert when email format is invalid", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, profile: { email: "jane@example.com" } }),
    });

    const { getByDisplayValue, getByText } = render(<UpdateEmail />);

    await waitFor(() => {
      expect(getByDisplayValue("jane@example.com")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("jane@example.com"), "not-an-email");
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid email",
      "Please enter a valid email address."
    );
  });

  it("sends POST with new email when Save is pressed and API returns success", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (_url: string, opts?: RequestInit) => {
      const isPost = opts?.method === "POST";
      return Promise.resolve({
        ok: true,
        json: async () =>
          isPost
            ? { success: true, message: "Profile updated" }
            : { success: true, profile: { email: "old@example.com" } },
      });
    });

    const { getByDisplayValue, getByTestId } = render(<UpdateEmail />);

    await waitFor(() => {
      expect(getByDisplayValue("old@example.com")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("old@example.com"), "new@example.com");
    fireEvent.press(getByTestId("update-email-save"));

    await waitFor(
      () => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const postCall = calls.find((c: any) => c[1]?.method === "POST");
        expect(postCall).toBeDefined();
        expect(JSON.parse(postCall![1].body).email).toBe("new@example.com");
      },
      { timeout: 2000 }
    );
  });

  it("shows alert when POST fails", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          profile: { email: "jane@example.com" },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Email already in use" }),
      });

    const { getByDisplayValue, getByText } = render(<UpdateEmail />);

    await waitFor(() => {
      expect(getByDisplayValue("jane@example.com")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("jane@example.com"), "taken@example.com");
    fireEvent.press(getByText("Save"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed", "Email already in use");
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
