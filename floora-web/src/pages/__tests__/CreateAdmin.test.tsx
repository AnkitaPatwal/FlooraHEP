import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CreateAdmin from "../CreateAdmin";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

import { supabase } from "../../lib/supabase-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <CreateAdmin />
    </MemoryRouter>
  );

const mockSuperAdminSession = {
  data: {
    session: {
      access_token: "mock-token",
      user: {
        id: "uuid-super",
        email: "super@floora.com",
        user_metadata: { role: "super_admin" },
      },
    },
  },
};

const mockAdminSession = {
  data: {
    session: {
      access_token: "mock-token",
      user: {
        id: "uuid-admin",
        email: "admin@floora.com",
        user_metadata: { role: "admin" },
      },
    },
  },
};

describe("CreateAdmin component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // it("old tests from previous sprint can be commented out here if needed");

  it("shows loading state while checking access", () => {
    (supabase.auth.getSession as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderWithRouter();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows unauthorized when no session", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Unauthorized: please log in")
      ).toBeInTheDocument();
    });
  });

  it("shows forbidden when role is admin not super_admin", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce(mockAdminSession);

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText("Unauthorized: you do not have access to this page")
      ).toBeInTheDocument();
    });
  });

  it("renders invite form for super_admin", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce(mockSuperAdminSession);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });
  });

  it("shows email validation error when email is empty", async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce(mockSuperAdminSession);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });
  });

  it("calls invite API with correct email on submit", async () => {
    (supabase.auth.getSession as any)
      .mockResolvedValueOnce(mockSuperAdminSession) // access check
      .mockResolvedValueOnce(mockSuperAdminSession); // handleSubmit
  
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  
    renderWithRouter();
  
    await waitFor(() => {
      expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    });
  
    fireEvent.change(screen.getByPlaceholderText("admin@example.com"), {
      target: { value: "newadmin@floora.com" },
    });
    fireEvent.click(screen.getByText("Submit"));
  
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/invite"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("newadmin@floora.com"),
        })
      );
    });
  });
  
  it("shows success message after invite is sent", async () => {
    (supabase.auth.getSession as any)
      .mockResolvedValueOnce(mockSuperAdminSession)
      .mockResolvedValueOnce(mockSuperAdminSession);
  
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  
    renderWithRouter();
  
    await waitFor(() => {
      expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    });
  
    fireEvent.change(screen.getByPlaceholderText("admin@example.com"), {
      target: { value: "newadmin@floora.com" },
    });
    fireEvent.click(screen.getByText("Submit"));
  
    await waitFor(() => {
      expect(screen.getByText("Invite sent successfully.")).toBeInTheDocument();
    });
  });
  
  it("shows error message when invite fails", async () => {
    (supabase.auth.getSession as any)
      .mockResolvedValueOnce(mockSuperAdminSession)
      .mockResolvedValueOnce(mockSuperAdminSession);
  
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Email rate limit exceeded" }),
    });
  
    renderWithRouter();
  
    await waitFor(() => {
      expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    });
  
    fireEvent.change(screen.getByPlaceholderText("admin@example.com"), {
      target: { value: "newadmin@floora.com" },
    });
    fireEvent.click(screen.getByText("Submit"));
  
    await waitFor(() => {
      expect(screen.getByText("Email rate limit exceeded")).toBeInTheDocument();
    });
  });
});