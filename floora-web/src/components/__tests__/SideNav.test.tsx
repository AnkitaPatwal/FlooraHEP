import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SideNav from "../layouts/SideNav";

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

// Mock react-icons to avoid SVG rendering issues in tests
vi.mock("react-icons/fa", () => ({
  FaTachometerAlt: () => <span>icon</span>,
  FaUsers: () => <span>icon</span>,
  FaClipboardList: () => <span>icon</span>,
  FaCalendarAlt: () => <span>icon</span>,
  FaDumbbell: () => <span>icon</span>,
  FaUserCircle: () => <span>icon</span>,
  FaEllipsisV: () => <span>icon</span>,
  FaUserPlus: () => <span>icon</span>,
  FaSignOutAlt: () => <span>icon</span>,
}));

import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";

const renderWithRouter = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/*" element={<SideNav />} />
        <Route path="/admin-login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("SideNav", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all nav links for admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Assign Plans")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Plans")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Exercises")).toBeInTheDocument();
  });

  it("does not show Create Admin link for regular admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter();

    expect(screen.queryByText("Create Admin")).not.toBeInTheDocument();
  });

  it("shows Create Admin link for super_admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-456", email: "super@floora.com", role: "super_admin" },
      isSuperAdmin: true,
      isAuthLoading: false,
    });

    renderWithRouter();

    expect(screen.getByText("Create Admin")).toBeInTheDocument();
  });

  it("shows Admin in footer for regular admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    renderWithRouter();

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows Super Admin in footer for super_admin", () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-456", email: "super@floora.com", role: "super_admin" },
      isSuperAdmin: true,
      isAuthLoading: false,
    });

    renderWithRouter();

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("calls signOut and redirects on logout click", async () => {
    (useAuth as any).mockReturnValue({
      admin: { id: "uuid-123", email: "admin@floora.com", role: "admin" },
      isSuperAdmin: false,
      isAuthLoading: false,
    });

    (supabase.auth.signOut as any).mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<SideNav />} />
          <Route path="/admin-login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle("Log out"));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });
});