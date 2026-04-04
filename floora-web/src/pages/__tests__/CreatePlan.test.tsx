import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CreatePlan from "../main/CreatePlan";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-access-token",
            user: {
              id: "mock-user-id",
              email: "admin@floora.com",
              user_metadata: { role: "admin" },
            },
          },
        },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const moduleRow = (id: number, title: string, cat: string) => ({
  module_id: id,
  title,
  description: cat,
  session_number: id,
  module_exercise: [
    {
      module_exercise_id: id,
      order_index: 1,
      exercise: { exercise_id: id, title: "Ex", thumbnail_url: null },
    },
  ],
});

const renderWithRouter = (ui: React.ReactElement, { route = "/plan-dashboard/create" } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/plan-dashboard/create" element={ui} />
        <Route path="/plan-dashboard/:id/edit" element={ui} />
        <Route path="/plan-dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("CreatePlan component", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              moduleRow(1, "Lower Back Mobility", "Back Pain"),
              moduleRow(2, "Gentle Stretch", "Back Pain"),
            ]),
        });
      }
      return Promise.reject(new Error(`not mocked: ${url}`));
    });
  });

  it("renders create flow and loads sessions grid", async () => {
    renderWithRouter(<CreatePlan />);

    expect(screen.getByText("Create New Plan")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });
  });

  it("selects a session from the grid", async () => {
    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Lower Back Mobility/i }));

    expect(screen.getByRole("img", { name: /1 session in this plan/i })).toBeInTheDocument();
  });

  it("saves a new plan and navigates to dashboard", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([moduleRow(1, "Lower Back Mobility", "Back Pain")]),
        });
      }
      if (url.includes("/api/admin/plans") && !url.match(/\/plans\/\d+/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Plan created successfully.", planId: 1 }),
        });
      }
      return Promise.reject(new Error(`not mocked: ${url}`));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "New Plan" } });
    fireEvent.click(screen.getByRole("button", { name: /Lower Back Mobility/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("shows error when save fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([moduleRow(1, "Lower Back Mobility", "Back Pain")]),
        });
      }
      if (url.includes("/api/admin/plans") && !url.match(/\/plans\/\d+/)) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to create plan in DB" }),
        });
      }
      return Promise.reject(new Error(`not mocked: ${url}`));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "New Plan" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create plan in DB")).toBeInTheDocument();
    });
  });
});
