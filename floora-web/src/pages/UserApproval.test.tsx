import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserApproval from "./UserApproval";
import type { PendingClient } from "../lib/admin-api";
// Mock the AppLayout component
// to return a div with the data-testid "app-layout"
vi.mock("../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

// Helper function to render the UserApproval component with a router
function renderWithRouter(
  initialEntry: string,
  state?: { user: PendingClient }
) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: initialEntry, state }]}
      initialIndex={0}
    >
      <Routes>
        <Route path="/user-approval" element={<UserApproval />} />
        <Route path="/users" element={<div>Users page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UserApproval", () => {
  // Clean up the DOM after each test
  beforeEach(() => cleanup());

  // Shows the selected pending user name and email
  it("shows the selected pending user name and email", () => {
    const user: PendingClient = {
      user_id: 42,
      email: "remote-verify@example.com",
      fname: "Remote",
      lname: "Verify",
      status: false,
    };

    renderWithRouter("/user-approval", { user });
    // Check that the name and email are displayed
    expect(screen.getByDisplayValue("Remote Verify")).toBeInTheDocument();
    expect(screen.getByDisplayValue("remote-verify@example.com")).toBeInTheDocument();
    expect(screen.getByText("Remote Verify")).toBeInTheDocument(); // subtitle
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deny/i })).toBeInTheDocument();
  });

  it("shows initials in avatar when user has fname and lname", () => {
    const user: PendingClient = {
      user_id: 1,
      email: "jane@example.com",
      fname: "Jane",
      lname: "Doe",
      status: false,
    };

    renderWithRouter("/user-approval", { user });

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows empty state when no user is selected", () => {
    renderWithRouter("/user-approval");

    expect(
      screen.getByText(/no user selected.*go back and click a pending user/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });
});
