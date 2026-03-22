import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminRoute } from "../AdminRoute";

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
      </Routes>
    </MemoryRouter>
  );

describe("AdminRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing while auth is loading", () => {
    (useAuth as any).mockReturnValue({
      admin: null,
      loading: true,
    });

    const { container } = renderWithRouter(
      <AdminRoute>
        <div>Protected Content</div>
      </AdminRoute>
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    (useAuth as any).mockReturnValue({
      admin: null,
      loading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <div>Protected Content</div>
      </AdminRoute>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      loading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <div>Protected Content</div>
      </AdminRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when user is super_admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-456", email: "super@floora.com", role: "super_admin" },
      loading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <div>Protected Content</div>
      </AdminRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});