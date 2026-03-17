import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AdminLogin from "../AdminLogin";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    admin: null,
    isSuperAdmin: false,
    loading: false,
    isAuthLoading: false,
    refreshAuth: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import mocked modules AFTER vi.mock calls
import { supabase } from "../../lib/supabase-client";
import { useAuth } from "../../lib/auth";

const renderWithRouter = () => {
  return render(
    <MemoryRouter initialEntries={["/admin-login"]}>
      <Routes>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("AdminLogin component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
  });

  it("renders login form", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("Admin Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Admin Password")).toBeInTheDocument();
    expect(screen.getByText("Admin Sign In")).toBeInTheDocument();
  });

  it("calls signInWithPassword with correct credentials", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({ error: null });
    (useAuth().refreshAuth as any) = vi.fn().mockResolvedValueOnce(undefined);

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Admin Email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Admin Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Admin Sign In"));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "admin@floora.com",
        password: "password123",
      });
    });
  });

  it("shows error message on invalid credentials", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Admin Email"), {
      target: { value: "wrong@floora.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Admin Password"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByText("Admin Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Incorrect email or password.")).toBeInTheDocument();
    });
  });

  it("shows generic error for non-credential errors", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      error: { message: "Network error" },
    });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Admin Email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Admin Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Admin Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("navigates to dashboard on successful login", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({ error: null });

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Admin Email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Admin Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Admin Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    (supabase.auth.signInWithPassword as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 500))
    );

    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Admin Email"), {
      target: { value: "admin@floora.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Admin Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Admin Sign In"));

    await waitFor(() => {
      expect(screen.getByText("Signing in…")).toBeDisabled();
    });
  });
});