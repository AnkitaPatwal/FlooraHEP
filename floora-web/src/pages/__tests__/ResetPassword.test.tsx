import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPassword from "../ResetPassword";

describe("ResetPassword", () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Password has been reset successfully" }),
      })
    );
    Object.defineProperty(import.meta, "env", {
      value: {
        ...originalEnv,
        VITE_SUPABASE_URL: "https://test.supabase.co",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(import.meta, "env", { value: originalEnv, configurable: true });
  });

  const renderWithRouter = (search = "?token=testtokenhex") =>
    render(
      <MemoryRouter initialEntries={[`/reset-password${search}`]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin-login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it("renders the reset password form", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByText("Update Password")).toBeInTheDocument();
  });

  it("shows error when token is missing", () => {
    renderWithRouter("");
    expect(
      screen.getByText(/This reset link is invalid or expired/i)
    ).toBeInTheDocument();
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
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
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

  it("calls reset-password edge function on valid submit", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/functions/v1/reset-password",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-anon-key",
            apikey: "test-anon-key",
          },
          body: JSON.stringify({ token: "testtokenhex", password: "newpassword123" }),
        })
      );
    });
  });

  it("shows success message after password is updated", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByText("Update Password"));

    await waitFor(() => {
      expect(screen.getByText(/Password updated! Redirecting to login/)).toBeInTheDocument();
    });
  });

  it("shows error message when reset fails", async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid or expired token" }),
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
      expect(screen.getByText("Invalid or expired token")).toBeInTheDocument();
    });
  });

});
