import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DeniedUserDetail from "./DeniedUserDetail";
import type { PendingClient } from "../lib/admin-api";

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

function renderWithRouter(initialEntry: string, state?: { user: PendingClient }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initialEntry, state }]} initialIndex={0}>
      <Routes>
        <Route path="/denied-user" element={<DeniedUserDetail />} />
        <Route path="/users" element={<div>Users page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DeniedUserDetail", () => {
  beforeEach(() => {
    cleanup();
    mockDeleteClient.mockReset();
  });

  it("shows denied user name and email", async () => {
    const user: PendingClient = {
      user_id: 99,
      email: "denied@example.com",
      fname: "No",
      lname: "Access",
      status: false,
    };
    renderWithRouter("/denied-user", { user });
    expect(await screen.findByDisplayValue("No Access")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("denied@example.com")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /delete user/i })).toBeInTheDocument();
  });

  it("shows empty state when no user is selected", () => {
    renderWithRouter("/denied-user");
    expect(
      screen.getByText(/no user selected.*go back and click a denied user/i),
    ).toBeInTheDocument();
  });

  it("calls deleteClient after confirming", async () => {
    mockDeleteClient.mockResolvedValueOnce(undefined);
    const user: PendingClient = {
      user_id: 5,
      email: "x@example.com",
      fname: "A",
      lname: "B",
      status: false,
    };
    renderWithRouter("/denied-user", { user });

    fireEvent.click(screen.getByRole("button", { name: /delete user/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteClient).toHaveBeenCalledWith(1, 5);
    });
  });
});
