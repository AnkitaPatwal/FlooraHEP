import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserApproval from "./UserApproval";
import type { PendingClient } from "../lib/admin-api";

// Mock the approveClient and denyClient functions
const mockApproveClient = vi.fn();
const mockDenyClient = vi.fn();
vi.mock("../lib/admin-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/admin-api")>();
  return {
    ...actual,
    approveClient: (...args: unknown[]) => mockApproveClient(...args),
    denyClient: (...args: unknown[]) => mockDenyClient(...args),
  };
});
// Mock the AppLayout component
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

// Describe the UserApproval component
describe("UserApproval", () => {
  // Clean up the DOM and reset the mock functions before each test
  beforeEach(() => {
    cleanup();
    mockApproveClient.mockReset();
    mockDenyClient.mockReset();
  });

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

  // Calls approveClient and navigates to users when Approve is clicked
  it("calls approveClient and navigates to users when Approve is clicked", async () => {
    mockApproveClient.mockResolvedValueOnce(undefined);
    const user: PendingClient = {
      user_id: 10,
      email: "approve-me@example.com",
      fname: "Approve",
      lname: "Me",
      status: false,
    };

    renderWithRouter("/user-approval", { user });
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(mockApproveClient).toHaveBeenCalledWith(1, 10);
    });
    expect(screen.getByText("Users page")).toBeInTheDocument();
  });

  it("calls denyClient and navigates to users when Deny is clicked", async () => {
    mockDenyClient.mockResolvedValueOnce(undefined);
    const user: PendingClient = {
      user_id: 20,
      email: "deny-me@example.com",
      fname: "Deny",
      lname: "Me",
      status: false,
    };

    renderWithRouter("/user-approval", { user });
    fireEvent.click(screen.getByRole("button", { name: /deny/i }));

    await waitFor(() => {
      expect(mockDenyClient).toHaveBeenCalledWith(1, 20);
    });
    expect(screen.getByText("Users page")).toBeInTheDocument();
  });
});
