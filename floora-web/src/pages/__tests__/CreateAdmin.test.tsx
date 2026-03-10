import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateAdmin from "../CreateAdmin";

// keep tests isolated from layout/sidebar
vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={["/create-admin"]}>
      <CreateAdmin />
    </MemoryRouter>
  );
};

type MockFetchOpts = {
  meStatus?: number;
  meRole?: "super_admin" | "admin" | null;
  assignStatus?: number;
};

const mockFetch = (opts: MockFetchOpts) => {
  const meStatus = opts.meStatus ?? 200;
  const meRole = opts.meRole ?? "super_admin";
  const assignStatus = opts.assignStatus ?? 200;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    // GET /me
    if (url.includes("/api/admin/me")) {
      if (meStatus === 200) {
        return new Response(
          JSON.stringify({
            ok: true,
            admin: { id: 1, email: "sa@example.com", role: meRole, name: "SA" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // 401 / 403 / etc
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: meStatus,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /assign-admin-role
    if (url.includes("/api/admin/assign-admin-role")) {
      if (assignStatus === 200) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Backend failure" }), {
        status: assignStatus,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Not mocked" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("CreateAdmin (UI + access)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the form and keeps submit disabled until email is valid", async () => {
    mockFetch({ meStatus: 200, meRole: "super_admin" });
    const user = userEvent.setup();
    renderPage();

    const emailInput = await screen.findByPlaceholderText("admin@example.com");
    const submitBtn = screen.getByRole("button", { name: /submit/i });

    // empty -> disabled
    expect(submitBtn).toBeDisabled();

    // invalid -> still disabled
    await user.type(emailInput, "kk");
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // valid -> enabled
    await user.clear(emailInput);
    await user.type(emailInput, "admin@example.com");
    expect(submitBtn).toBeEnabled();
  });

  it("submits and shows success message", async () => {
    mockFetch({ meStatus: 200, meRole: "super_admin", assignStatus: 200 });
    const user = userEvent.setup();
    renderPage();

    const emailInput = await screen.findByPlaceholderText("admin@example.com");
    const nameInput = screen.getByPlaceholderText("Admin Name");
    const submitBtn = screen.getByRole("button", { name: /submit/i });

    await user.type(emailInput, "admin@example.com");
    await user.type(nameInput, "Test Admin");
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    // "Saving..." might be too fast to catch; just assert final success
    expect(
      await screen.findByText(/admin role assigned successfully\./i, {}, { timeout: 2000 })
    ).toBeInTheDocument();

    // fields cleared after success
    await waitFor(() => {
      expect(emailInput).toHaveValue("");
      expect(nameInput).toHaveValue("");
    });
  });
});