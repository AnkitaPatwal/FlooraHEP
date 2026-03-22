import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../ForgotPassword";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
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
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

describe("ForgotPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the forgot password form", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("does not call resetPasswordForEmail when email is empty", async () => {
    renderWithRouter();
    fireEvent.click(screen.getByText("Reset Password"));
    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  it("shows error when email is empty", async () => {
    renderWithRouter();
    fireEvent.click(screen.getByText("Reset Password"));
    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    });
  });

  it("calls resetPasswordForEmail with correct email", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
      error: null,
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "admin@floora.com",
        { redirectTo: "http://localhost:5173/reset-password" }
      );
    });
  });

  it("shows success message after email is sent", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
      error: null,
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(
        screen.getByText("A reset email has been sent to your email")
      ).toBeInTheDocument();
    });
  });

  it("shows error message when resetPasswordForEmail fails", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
      error: { message: "Email not found" },
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "unknown@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText("Email not found")).toBeInTheDocument();
    });
  });

  it("shows resend button after success", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
      error: null,
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText(/Resend/i)).toBeInTheDocument();
    });
  });
});