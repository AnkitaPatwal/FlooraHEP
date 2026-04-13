import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import Dashboard from "../main/Dashboard";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

import { supabase } from "../../lib/supabase-client";

const mockFetch = vi.fn();

describe("Dashboard", () => {
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

  const dashboardJson = {
    counts: {
      totalUsers: 1,
      pendingUsers: 0,
      plans: 0,
      sessions: 0,
      exercises: 0,
    },
    topPlans: [],
    userOverview: [],
    recentActivity: [],
  };

  it("shows loading then summary when fetch succeeds", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(dashboardJson), { status: 200 }),
    );

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Total users")).toBeInTheDocument();
    });

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows server error message and retry", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Failed to load dashboard data." }), {
        status: 500,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load dashboard data."),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows success after retry recovers", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(dashboardJson), { status: 200 }),
      );

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/dashboard refreshed/i)).toBeInTheDocument();
    });
  });

  it("dismisses the banner", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 503 }),
    );

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("bad")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => {
      expect(screen.queryByText("bad")).not.toBeInTheDocument();
    });
  });
});
