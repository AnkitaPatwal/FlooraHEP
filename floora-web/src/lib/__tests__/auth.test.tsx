import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth, clearAdminSession } from "../auth";
import { supabase } from "../supabase-client";

vi.mock("../supabase-client", () => ({
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

function TestComponent() {
  const { admin, isSuperAdmin, isAuthLoading } = useAuth();
  if (isAuthLoading) return <div>Loading</div>;
  return (
    <div>
      <div data-testid="email">{admin?.email ?? "no-user"}</div>
      <div data-testid="role">{admin?.role ?? "no-role"}</div>
      <div data-testid="is-super">{isSuperAdmin ? "true" : "false"}</div>
    </div>
  );
}

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("shows loading state initially", () => {
    (supabase.auth.getSession as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderWithAuth();
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("sets admin user from session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "uuid-123",
            email: "admin@floora.com",
            user_metadata: { role: "admin" },
          },
        },
      },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("admin@floora.com");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("is-super").textContent).toBe("false");
    });
  });

  it("sets isSuperAdmin true when role is super_admin", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "uuid-456",
            email: "super@floora.com",
            user_metadata: { role: "super_admin" },
          },
        },
      },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("is-super").textContent).toBe("true");
    });
  });

  it("sets admin to null when no session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("no-user");
      expect(screen.getByTestId("is-super").textContent).toBe("false");
    });
  });

  it("updates admin when onAuthStateChange fires", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
    });

    let authChangeCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("no-user");
    });

    authChangeCallback("SIGNED_IN", {
      user: {
        id: "uuid-789",
        email: "newadmin@floora.com",
        user_metadata: { role: "admin" },
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("newadmin@floora.com");
    });
  });

  it("clears admin when onAuthStateChange fires with null session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "uuid-123",
            email: "admin@floora.com",
            user_metadata: { role: "admin" },
          },
        },
      },
    });

    let authChangeCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("admin@floora.com");
    });

    authChangeCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByTestId("email").textContent).toBe("no-user");
    });
  });
});

describe("clearAdminSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls supabase.auth.signOut", async () => {
    (supabase.auth.signOut as any).mockResolvedValueOnce({});
    await clearAdminSession();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
  });
});