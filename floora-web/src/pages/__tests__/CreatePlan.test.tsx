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

const mockModule = (overrides: Record<string, unknown> = {}) => ({
  module_id: 1,
  title: "Lower Back Mobility",
  description: "Back Pain session focusing on mobility",
  session_number: 1,
  module_exercise: [],
  assigned_user_count: 0,
  ...overrides,
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = (ui: React.ReactElement, { route = "/plan-dashboard/create" } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/plan-dashboard/create" element={ui} />
        <Route path="/plan-dashboard/:id/edit" element={ui} />
        <Route path="/plan-dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("CreatePlan component", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation((url) => {
      if (String(url).includes("/api/admin/categories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (String(url).includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              mockModule({ module_id: 1, title: "Lower Back Mobility" }),
              mockModule({
                module_id: 2,
                title: "Gentle Stretch",
                description: "Gentle stretching for back pain relief",
              }),
              mockModule({
                module_id: 3,
                title: "Relax & Release",
                description: "Relax and release tension in the back",
              }),
            ]),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });
  });

  it("renders and fetches available sessions", async () => {
    renderWithRouter(<CreatePlan />);

    expect(screen.getByText("Create New Plan")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
      expect(screen.getByText("Gentle Stretch")).toBeInTheDocument();
    });
  });

  it("toggles session selection via card click", async () => {
    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Lower Back Mobility/i })).toBeInTheDocument();
    });

    const card = screen.getByRole("button", { name: /Lower Back Mobility/i });
    fireEvent.click(card);
    expect(card.className).toContain("is-selected");

    fireEvent.click(card);
    expect(card.className).not.toContain("is-selected");
  });

  it("handles saving the plan successfully", async () => {
    mockFetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/api/admin/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (u.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockModule()]),
        });
      }
      if (u.includes("/api/admin/plans")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Success", planId: 1 }),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Lower Back Mobility/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "New Plan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Describe this plan…"), {
      target: { value: "A description" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Lower Back Mobility/i }));

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("handles failure when saving a plan", async () => {
    mockFetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/api/admin/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (u.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockModule()]),
        });
      }
      if (u.includes("/api/admin/plans")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to create plan in DB" }),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "New Plan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Describe this plan…"), {
      target: { value: "A description" },
    });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Failed to create plan in DB")).toBeInTheDocument();
    });
  });
});
