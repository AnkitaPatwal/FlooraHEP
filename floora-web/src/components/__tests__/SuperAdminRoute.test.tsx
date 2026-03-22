import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SuperAdminRoute } from "../SuperAdminRoute";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

vi.mock("../../lib/auth", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from "../../lib/auth";

const renderWithRouter = (ui: React.ReactElement, initialPath = "/protected") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/admin-login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("SuperAdminRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing while auth is loading", () => {
    (useAuth as any).mockReturnValue({
      admin: null,
      isSuperAdmin: false,
      isAuthLoading: true,
    });

    const { container } = renderWithRouter(
      <SuperAdminRoute fallbackTo="/dashboard">
        <div>Secret Content</div>
      </SuperAdminRoute>
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    (useAuth as any).mockReturnValue({
      admin: null,
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter(
      <SuperAdminRoute fallbackTo="/dashboard">
        <div>Secret Content</div>
      </SuperAdminRoute>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("redirects to fallback when role is admin not super_admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter(
      <SuperAdminRoute fallbackTo="/dashboard">
        <div>Secret Content</div>
      </SuperAdminRoute>
    );

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders children when role is super_admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-456", email: "super@floora.com", role: "super_admin" },
      isSuperAdmin: true,
      isAuthLoading: false,
    });

    renderWithRouter(
      <SuperAdminRoute fallbackTo="/dashboard">
        <div>Secret Content</div>
      </SuperAdminRoute>
    );

    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });

  it("supports dynamic fallback function", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter(
      <SuperAdminRoute fallbackTo={() => "/dashboard"}>
        <div>Secret Content</div>
      </SuperAdminRoute>
    );

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });
});