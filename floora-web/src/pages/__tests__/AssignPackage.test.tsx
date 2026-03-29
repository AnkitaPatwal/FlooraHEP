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
  });

  it("fetches users and plans with bearer token headers", async () => {
    render(<AssignPackage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/assign-package/users"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/assign-package/plans"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });
});