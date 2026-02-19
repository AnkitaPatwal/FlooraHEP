import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPendingClients,
  fetchActiveClients,
  approveClient,
  denyClient,
} from "./admin-api";

// Describe the admin-api component
describe("admin-api", () => {
  // Clean up the DOM and reset the mock functions before each test
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("fetchPendingClients", () => {
  // Returns pending clients when API returns 200 with array
  it("returns pending clients when API returns 200 with array", async () => {
    // Mock the fetch function to return a 200 response with an array of pending clients
    const pending = [
      {
        user_id: 1,
        email: "jane@example.com",
        fname: "Jane",
        lname: "Doe",
        status: false,
      },
    ];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(pending)),
    } as Response);

    const result = await fetchPendingClients();
    // Returns empty array when API returns 200 with non-array body
    expect(result).toEqual(pending);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/admin-approval"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: expect.stringMatching(/^Bearer /),
        }),
        body: "{}",
      })
    );
  });
  // Returns empty array when API returns 200 with non-array body
  it("returns empty array when API returns 200 with non-array body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("null"),
    } as Response);

    const result = await fetchPendingClients();

    expect(result).toEqual([]);
  });

  // Throws with message when API returns 401
  it("throws with message when API returns 401", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: "Missing or invalid authorization header" })
        ),
    } as Response);

    await expect(fetchPendingClients()).rejects.toThrow(
      "Missing or invalid authorization header"
    );
  });

  // Throws with status when API returns error without body.error
  it("throws with status when API returns error without body.error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    } as Response);

    await expect(fetchPendingClients()).rejects.toThrow("Request failed (500)");
  });
  });

  describe("fetchActiveClients", () => {
    it("returns approved clients when API returns 200 with array", async () => {
      const approved = [
        {
          user_id: 2,
          email: "approved@example.com",
          fname: "Approved",
          lname: "User",
          status: true,
        },
      ];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(approved)),
      } as Response);

      const result = await fetchActiveClients();

      expect(result).toEqual(approved);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/admin-approval"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ list: "approved" }),
        })
      );
    });

    it("returns empty array when API returns non-array", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("null"),
      } as Response);

      const result = await fetchActiveClients();

      expect(result).toEqual([]);
    });
  });
  // Sends action approve and resolves on 200
  describe("approveClient", () => {
    it("sends action approve and resolves on 200", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      } as Response);

      await approveClient(1, 42);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "approve",
            admin_id: 1,
            user_id: 42,
          }),
        })
      );
    });

    it("throws helpful message on 404 Not Found", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: "Not Found" })),
      } as Response);

      await expect(approveClient(1, 42)).rejects.toThrow(
        /admin-approval function not found/
      );
    });
  });
  // Sends action deny and resolves on 200
  describe("denyClient", () => {
    it("sends action deny and resolves on 200", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      } as Response);

      await denyClient(1, 99);
      // Checks that the fetch function was called with the correct arguments
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "deny",
            admin_id: 1,
            user_id: 99,
          }),
        })
      );
    });
  });
});
