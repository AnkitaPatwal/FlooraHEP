import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import Plan from "../main/Plan";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../hooks/useAssignmentCountsRefresh", () => ({
  useAssignmentCountsRefresh: () => ({
    location: { key: "k1", pathname: "/plan-dashboard", search: "", hash: "", state: null },
    refreshToken: 0,
  }),
}));

vi.mock("../../lib/assignmentCountsVersionStore", () => ({
  getAssignmentCountsVersion: () => 0,
  subscribeAssignmentCountsVersion: () => () => {},
}));

vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

import { supabase } from "../../lib/supabase-client";

const mockFetch = vi.fn();

describe("Plan (list)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { access_token: "t" } },
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const planRow = {
    plan_id: 1,
    title: "Alpha",
    description: "Desc",
    category_id: 1,
    plan_category: { category_id: 1, name: "Cat" },
    plan_module: [],
    assigned_user_count: 0,
    cover_thumbnail_url: null,
  };

  it("shows loading then plan cards when fetch succeeds", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([planRow]), { status: 200 }),
    );

    render(
      <MemoryRouter initialEntries={["/plan-dashboard"]}>
        <Plan />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading plans/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });

  it("shows API error with retry", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Failed to fetch plans" }), {
        status: 500,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/plan-dashboard"]}>
        <Plan />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch plans")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows success after retry recovers", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([planRow]), { status: 200 }),
      );

    render(
      <MemoryRouter initialEntries={["/plan-dashboard"]}>
        <Plan />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/plans refreshed/i)).toBeInTheDocument();
    });
  });
});
