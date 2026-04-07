// floora-web/src/pages/__tests__/AssignPackage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignPackage from "../AssignPackage";

vi.mock("../../lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: "test-token",
          },
        },
      })),
    },
  },
}));

function renderAssignPackageAt(path = "/assign-package") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/assign-package/*" element={<AssignPackage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AssignPackage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
  });

  it("list page fetches users with bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "user-1",
          email: "test@example.com",
          full_name: "Test User",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAssignPackageAt();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/assign-package/users"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("list page shows client full name and hides manage subtitle", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "user-1",
          email: "test@example.com",
          full_name: "Test User",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAssignPackageAt();

    expect(await screen.findByText("Test User")).toBeInTheDocument();
    expect(screen.queryByText(/select to manage assigned plans/i)).toBeNull();
  });

  it("list page falls back to email if name missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "user-1",
          email: "test@example.com",
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAssignPackageAt();

    expect(await screen.findByText("test@example.com")).toBeInTheDocument();
  });
});
