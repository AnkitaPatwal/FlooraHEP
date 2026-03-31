// floora-web/src/pages/__tests__/AssignPackage.test.tsx
import { render, waitFor } from "@testing-library/react";
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

describe("AssignPackage auth", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "user-1", email: "test@example.com" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ plan_id: 1, title: "Starter Plan" }],
        })
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Assign Package" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "client@example.com" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Recovery Plan" })).toBeInTheDocument();
    });
  });

  it("fetches users and plans with bearer token headers", async () => {
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
    fireEvent.change(screen.getByLabelText("Program start date"), {
      target: { value: "2026-06-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Assign Package" }));

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
      expect(screen.getByRole("status")).toHaveTextContent(
        "Package assigned successfully. Program start date: 2026-06-15."
      );
    });
  });

  it("shows validation when user or plan is not selected", async () => {
    render(<AssignPackage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Recovery Plan" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Assign Package" }));

    expect(
      await screen.findByText(
        "Please select a user, a plan, and a start date before assigning."
      )
    ).toBeInTheDocument();
    expect(mockFetch.mock.calls.filter((c) => String(c[0]).includes("assign-package"))).toHaveLength(
      2
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "a@b.com" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("User"), { target: { value: "u1" } });
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Package" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This package is already assigned to this user."
      );
    });
  });
});