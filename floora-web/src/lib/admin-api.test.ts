import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPendingClients } from "./admin-api";

describe("fetchPendingClients", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
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
