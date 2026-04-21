import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserProfile from "./UserProfile";
import type { ActiveClient } from "../lib/admin-api";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

const mockDeleteClient = vi.fn();
const mockFetchClientProfileAvatar = vi.fn();
vi.mock("../lib/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/admin-api")>();
  return {
    ...actual,
    deleteClient: (...args: unknown[]) => mockDeleteClient(...args),
    fetchClientProfileAvatar: (userId: number) =>
      mockFetchClientProfileAvatar(userId),
  };
});

vi.mock("../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

function renderWithRouter(initialEntry: string, state?: { user: ActiveClient }) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: initialEntry, state }]}
      initialIndex={0}
    >
      <Routes>
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/users" element={<div>Users page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UserProfile", () => {
  beforeEach(() => {
    mockDeleteClient.mockReset();
    mockFetchClientProfileAvatar.mockReset();
    mockFetchClientProfileAvatar.mockResolvedValue(null);
  });

  it("shows empty message when no user in state", () => {
    renderWithRouter("/user-profile");
    expect(screen.getByText(/No user selected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("shows user name and email when user is in state", () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };

    renderWithRouter("/user-profile", { user });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("renders avatar image when avatar_url is set", async () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
      avatar_url: "https://example.com/profile.png",
    };
    mockFetchClientProfileAvatar.mockResolvedValue("https://example.com/profile.png");

    const { container } = renderWithRouter("/user-profile", { user });

    await waitFor(() => {
      expect(container.querySelector("img.ua-avatar")).toBeTruthy();
    });
    expect(container.querySelector("img.ua-avatar")).toHaveAttribute(
      "src",
      "https://example.com/profile.png"
    );
  });

  it("falls back to initials when avatar image fails to load", async () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
      avatar_url: "https://example.com/missing.png",
    };
    mockFetchClientProfileAvatar.mockResolvedValue("https://example.com/missing.png");

    const { container } = renderWithRouter("/user-profile", { user });

    await waitFor(() => {
      expect(container.querySelector("img.ua-avatar")).toBeTruthy();
    });
    fireEvent.error(container.querySelector("img.ua-avatar")!);

    await waitFor(() => {
      expect(container.querySelector("img.ua-avatar")).not.toBeInTheDocument();
    });
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows confirmation modal when Delete is clicked", async () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };

    renderWithRouter("/user-profile", { user });

    // Click the page Delete button once
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    // Wait for modal
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByText(/Are you sure you want to delete this user\?/i)
    ).toBeInTheDocument();

    // Verify modal buttons (scoped within dialog to avoid "two Delete buttons" issue)
    expect(within(dialog).getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", async () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };

    renderWithRouter("/user-profile", { user });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("calls deleteClient and navigates to users when Confirm Delete is clicked", async () => {
    mockDeleteClient.mockResolvedValueOnce(undefined);

    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };

    renderWithRouter("/user-profile", { user });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByRole("dialog");

    // Click the modal confirm delete (scoped)
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteClient).toHaveBeenCalledWith(1, 5);
    });

    await waitFor(() => {
      expect(screen.getByText("Users page")).toBeInTheDocument();
    });
  });
});