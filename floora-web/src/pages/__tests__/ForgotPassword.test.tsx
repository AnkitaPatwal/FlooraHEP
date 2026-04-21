import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../ForgotPassword";

describe("ForgotPassword", () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "If an account with this email exists, a reset link has been sent." }),
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

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

  it("renders the forgot password form", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
  });

  it("does not call fetch when email is empty", async () => {
    renderWithRouter();
    fireEvent.click(screen.getByText("Reset Password"));
    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls forgot-password edge function with web client", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/functions/v1/forgot-password",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-anon-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });
    const call = (fetch as unknown as Mock).mock.calls[0];
    const body = JSON.parse(call[1].body) as Record<string, string>;
    expect(body.email).toBe("admin@floora.com");
    expect(body.client).toBe("web");
    expect(body.reset_web_base).toMatch(/\/reset-password$/);
  });

  it("shows success message after email is sent", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(
        screen.getByText(/If an account exists for this email, we sent a reset link/)
      ).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Could not process request" }),
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "unknown@floora.com" },
    });
    fireEvent.click(screen.getByText("Reset Password"));

    await waitFor(() => {
      expect(screen.getByText("Could not process request")).toBeInTheDocument();
    });
  });

  it("shows resend control after success", async () => {
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
