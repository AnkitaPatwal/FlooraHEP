import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import AssignPackage from "../AssignPackage";

vi.mock("../../lib/auth", () => ({
  useAuth: vi.fn(() => ({ accessToken: "mock-token" })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AssignPackage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes("/api/assign-package/users")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: "user-uuid-1", email: "client@example.com" },
            ]),
        });
      }
      if (u.includes("/api/assign-package/plans")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ plan_id: 42, title: "Recovery Plan" }]),
        });
      }
      if (u.includes("/api/assign-package/assign-package")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error(`Unmocked fetch: ${u}`));
    });
  });

  it("loads users and plans from the API and renders dropdown options", async () => {
    render(<AssignPackage />);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/assign-package/users",
      expect.objectContaining({ credentials: "include" })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/assign-package/plans",
      expect.objectContaining({ credentials: "include" })
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Assign Plan" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "client@example.com" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Recovery Plan" })).toBeInTheDocument();
    });
  });

  it("POSTs assign-package with user_id, package_id, and start_date including credentials", async () => {
    render(<AssignPackage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "client@example.com" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("User"), {
      target: { value: "user-uuid-1" },
    });
    fireEvent.change(screen.getByLabelText("Plan"), {
      target: { value: "42" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-06-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Assign Plan" }));

    await waitFor(() => {
      const assignCalls = mockFetch.mock.calls.filter((c) =>
        String(c[0]).includes("/assign-package/assign-package")
      );
      expect(assignCalls.length).toBe(1);
      const [, init] = assignCalls[0];
      expect(init).toMatchObject({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({
        user_id: "user-uuid-1",
        package_id: 42,
        start_date: "2026-06-15",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Plan assigned successfully.");
    });
  });

  it("shows validation when user or plan is not selected", async () => {
    render(<AssignPackage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Recovery Plan" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Assign Plan" }));

    expect(
      await screen.findByText("Please select user, plan, and start date.")
    ).toBeInTheDocument();
    expect(mockFetch.mock.calls.filter((c) => String(c[0]).includes("assign-package"))).toHaveLength(
      2
    );
  });

  it("surfaces API error on failed assign", async () => {
    mockFetch.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes("/users") || u.includes("/plans")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              u.includes("users")
                ? [{ id: "u1", email: "a@b.com" }]
                : [{ plan_id: 1, title: "P" }]
            ),
        });
      }
      if (u.includes("/assign-package/assign-package")) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "This package is already assigned to this user." }),
        });
      }
      return Promise.reject(new Error(`Unmocked: ${u}`));
    });

    render(<AssignPackage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "a@b.com" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u1" } });
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Plan" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "This package is already assigned to this user."
      );
    });
  });
});
