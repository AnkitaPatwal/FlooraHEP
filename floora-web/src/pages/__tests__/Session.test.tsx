import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Session from "../main/Session";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../hooks/useAssignmentCountsRefresh", () => ({
  useAssignmentCountsRefresh: () => ({
    location: {
      key: "k1",
      pathname: "/sessions",
      search: "",
      hash: "",
      state: null,
    },
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

describe("Session (list)", () => {
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

  const moduleRow = {
    module_id: 1,
    title: "Week 1",
    description: "Starter",
    session_number: 1,
    module_exercise: [],
    assigned_user_count: 0,
  };

  it("shows loading then session cards when fetch succeeds", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([moduleRow]), { status: 200 }),
    );

    render(
      <MemoryRouter initialEntries={["/sessions"]}>
        <Session />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Week 1")).toBeInTheDocument();
    });
  });

  it("shows server message field on 401 (admin auth)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: "Unauthorized: Please log in." }),
        { status: 401 },
      ),
    );

    render(
      <MemoryRouter initialEntries={["/sessions"]}>
        <Session />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Unauthorized: Please log in."),
      ).toBeInTheDocument();
    });
  });

  it("shows success after retry recovers", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([moduleRow]), { status: 200 }),
      );

    render(
      <MemoryRouter initialEntries={["/sessions"]}>
        <Session />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/sessions refreshed/i)).toBeInTheDocument();
    });
  });
});
