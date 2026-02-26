import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserProfile from "./UserProfile";
import type { ActiveClient } from "../lib/admin-api";

const mockDeleteClient = vi.fn();
vi.mock("../lib/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/admin-api")>();
  return {
    ...actual,
    deleteClient: (...args: unknown[]) => mockDeleteClient(...args),
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
  });

  it("shows empty message when no user in state", () => {
    renderWithRouter("/user-profile");
    expect(
      screen.getByText(/No user selected. Go back and click an active user./i)
    ).toBeInTheDocument();
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

  it("shows confirmation modal when Delete is clicked", () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };
    renderWithRouter("/user-profile", { user });

    // Click the page delete button (unique BEFORE modal opens)
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(
      screen.getByText(/Are you sure you want to delete this client\?/i)
    ).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    const user: ActiveClient = {
      user_id: 5,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: true,
    };
    renderWithRouter("/user-profile", { user });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(
      screen.getByText(/Are you sure you want to delete this client\?/i)
    ).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(
      screen.queryByText(/Are you sure you want to delete this client\?/i)
    ).not.toBeInTheDocument();
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

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteClient).toHaveBeenCalledWith(1, 5);
    });

    await waitFor(() => {
      expect(screen.getByText("Users page")).toBeInTheDocument();
    });
  });
});