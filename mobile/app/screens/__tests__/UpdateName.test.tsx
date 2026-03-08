/**
 * ATH-386 / ATH-390: Profile info updates — unit tests for UpdateName screen
 */
import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import UpdateName from "../UpdateName";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({
    session: { access_token: "test-token", user: { email: "user@example.com" } },
  }),
}));

describe("UpdateName (ATH-386/ATH-390)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    jest.spyOn(require("react-native").Alert, "alert").mockImplementation(() => {});
  });

  it("renders Update Name title and loads current name", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { name: "Jane Doe", fname: "Jane", lname: "Doe" },
      }),
    });

    const { getByText, getByDisplayValue } = render(<UpdateName />);

    expect(getByText("Update Name")).toBeTruthy();

    await waitFor(() => {
      expect(getByDisplayValue("Jane Doe")).toBeTruthy();
    });
  });

  it("shows alert and does not POST when name is empty", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { name: "Jane", fname: "Jane", lname: "" },
      }),
    });

    const { getByDisplayValue, getByText } = render(<UpdateName />);

    await waitFor(() => {
      expect(getByDisplayValue("Jane")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("Jane"), "");
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith("Invalid name", "Please enter your name.");
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows alert when name exceeds max length", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, profile: { name: "J", fname: "J", lname: "" } }),
    });

    const { getByText, getByPlaceholderText } = render(<UpdateName />);

    await waitFor(() => {
      expect(getByPlaceholderText("Enter new name")).toBeTruthy();
    });

    const longName = "a".repeat(101);
    fireEvent.changeText(getByPlaceholderText("Enter new name"), longName);
    fireEvent.press(getByText("Save"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid name",
      "Name must be 100 characters or less."
    );
  });

  it("calls POST with trimmed name and navigates back on success", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          profile: { name: "Old Name", fname: "Old", lname: "Name" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: "Profile updated" }),
      });

    const { getByDisplayValue, getByText } = render(<UpdateName />);

    await waitFor(() => {
      expect(getByDisplayValue("Old Name")).toBeTruthy();
    });

    fireEvent.changeText(getByDisplayValue("Old Name"), "  New Name  ");
    fireEvent.press(getByText("Save"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://test.supabase.co/functions/v1/update-profile",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "New Name" }),
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it("shows alert when POST fails", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          profile: { name: "Jane", fname: "Jane", lname: "" },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Database error" }),
      });

    const { getByDisplayValue, getByText } = render(<UpdateName />);

    await waitFor(() => {
      expect(getByDisplayValue("Jane")).toBeTruthy();
    });

    fireEvent.press(getByText("Save"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed", "Database error");
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
