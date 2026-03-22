import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPassword from "../ResetPassword";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

import { supabase } from "../../lib/supabase-client";

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin-login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("ResetPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the reset password form", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("shows error when password is too short", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters.")
      ).toBeInTheDocument();
    });
  });

  it("shows error when passwords do not match", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  it("calls updateUser with new password on valid submit", async () => {
    (supabase.auth.updateUser as any).mockResolvedValueOnce({ error: null });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });
    });
  });

  it("shows success message after password is updated", async () => {
    (supabase.auth.updateUser as any).mockResolvedValueOnce({ error: null });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(
        screen.getByText("Password updated! Redirecting to login...")
      ).toBeInTheDocument();
    });
  });

  it("shows error message when updateUser fails", async () => {
    (supabase.auth.updateUser as any).mockResolvedValueOnce({
      error: { message: "Update failed" },
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  it("redirects to login after successful password reset", async () => {
    (supabase.auth.updateUser as any).mockResolvedValueOnce({ error: null });
  
    renderWithRouter();
  
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));
  
    await waitFor(() => {
      expect(
        screen.getByText("Password updated! Redirecting to login...")
      ).toBeInTheDocument();
    });
  
    // Wait for the 1500ms redirect timeout
    await new Promise((resolve) => setTimeout(resolve, 1600));
  
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });
});