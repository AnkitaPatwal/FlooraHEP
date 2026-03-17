import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminAcceptInvite from "../AdminAcceptInvite";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      setSession: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

import { supabase } from "../../lib/supabase-client";

const renderWithHash = (hash = "") => {
  // jsdom doesn't set window.location.hash from MemoryRouter
  // so we set it directly
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, hash },
  });

  return render(
    <MemoryRouter initialEntries={["/admin-accept-invite"]}>
      <Routes>
        <Route path="/admin-accept-invite" element={<AdminAcceptInvite />} />
        <Route path="/admin-login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("AdminAcceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when invite link is invalid (no hash tokens)", () => {
    renderWithHash("");
    expect(
      screen.getByText("Invalid invite link. Please ask a super admin to send a new invite.")
    ).toBeInTheDocument();
  });

  it("shows error when hash is missing type=invite", () => {
    renderWithHash("#access_token=abc123&type=recovery");
    expect(
      screen.getByText("Invalid invite link. Please ask a super admin to send a new invite.")
    ).toBeInTheDocument();
  });

  it("renders password form when hash has valid invite tokens", () => {
    renderWithHash("#access_token=abc123&refresh_token=def456&type=invite");
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(screen.getByText("Create admin account")).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderWithHash("#access_token=abc123&refresh_token=def456&type=invite");

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByText("Create admin account"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  it("shows error when password is too short", async () => {
    renderWithHash("#access_token=abc123&refresh_token=def456&type=invite");

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByText("Create admin account"));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters.")
      ).toBeInTheDocument();
    });
  });

  it("shows error when setSession fails", async () => {
    (supabase.auth.setSession as any).mockResolvedValueOnce({
      error: { message: "Invalid or expired invite link." },
    });

    renderWithHash("#access_token=abc123&refresh_token=def456&type=invite");

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Create admin account"));

    await waitFor(() => {
      expect(
        screen.getByText("Invite link is invalid or expired.")
      ).toBeInTheDocument();
    });
  });

  it("shows success and redirects on valid invite acceptance", async () => {
    (supabase.auth.setSession as any).mockResolvedValueOnce({ error: null });
    (supabase.auth.updateUser as any).mockResolvedValueOnce({ error: null });

    renderWithHash("#access_token=abc123&refresh_token=def456&type=invite");

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Create admin account"));

    await waitFor(() => {
      expect(
        screen.getByText("Account created. Redirecting to login...")
      ).toBeInTheDocument();
    });
  });
});