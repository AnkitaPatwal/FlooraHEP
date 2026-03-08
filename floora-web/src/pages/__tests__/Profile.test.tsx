import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { cleanup } from "@testing-library/react";
import Profile from "../main/Profile";

afterEach(() => cleanup());

// Mock AppLayout so tests don't depend on layout internals
vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

// Mock supabase client used by Profile.tsx
vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function renderAtProfileRoute() {
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Profile page", () => {
  it("shows loading indicator while fetching", async () => {
    // Keep promise pending until we assert loading is shown
    mockGetUser.mockReturnValue(new Promise(() => {}));

    renderAtProfileRoute();

    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it("renders profile data on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: {
        id: "user-123",
        email: "user@example.com",
        display_name: "Jane Doe",
        avatar_url: null,
      },
      error: null,
    });

    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    renderAtProfileRoute();

    // Loading first
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();

    // Then data appears
    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();
    });
  });

  it("shows an error message if auth fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth failed" },
    });

    renderAtProfileRoute();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Auth failed");
    });
  });

  it("shows an error message if profile fetch fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Profile not found" },
    });

    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    renderAtProfileRoute();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Profile not found");
    });
  });
});