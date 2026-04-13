import { describe, it, expect } from "vitest";
import {
  messageFromApiResponse,
  messageFromUnknownError,
  parseResponseJson,
} from "../api-errors";

describe("parseResponseJson", () => {
  it("returns null for empty body", async () => {
    const res = new Response("", { status: 200 });
    await expect(parseResponseJson(res)).resolves.toBeNull();
  });

  it("parses valid JSON", async () => {
    const res = new Response('{"a":1}', { status: 200 });
    await expect(parseResponseJson(res)).resolves.toEqual({ a: 1 });
  });

  it("returns null for invalid JSON", async () => {
    const res = new Response("not json", { status: 200 });
    await expect(parseResponseJson(res)).resolves.toBeNull();
  });
});

describe("messageFromApiResponse", () => {
  it("uses error field from JSON body when present", () => {
    const res = new Response(null, { status: 500 });
    expect(
      messageFromApiResponse(res, { error: "Server exploded" }, "fallback"),
    ).toBe("Server exploded");
  });

  it("uses HTTP status when not ok and no error string", () => {
    const res = new Response(null, { status: 503 });
    expect(messageFromApiResponse(res, {}, "fallback")).toBe(
      "Request failed (HTTP 503).",
    );
  });

  it("uses fallback when ok", () => {
    const res = new Response(null, { status: 200 });
    expect(messageFromApiResponse(res, {}, "all good")).toBe("all good");
  });
});

describe("messageFromUnknownError", () => {
  it("uses Error message when available", () => {
    expect(messageFromUnknownError(new Error("network"))).toBe("network");
  });

  it("uses fallback for unknown values", () => {
    expect(messageFromUnknownError(null, "oops")).toBe("oops");
  });
});
