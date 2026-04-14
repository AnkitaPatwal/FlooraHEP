/**
 * Read a fetch Response body as JSON when possible; returns null for empty or invalid JSON.
 */
export async function parseResponseJson(
  res: Response,
): Promise<unknown | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function stringField(
  body: unknown,
  key: "error" | "message",
): string | null {
  if (!body || typeof body !== "object" || !(key in body)) return null;
  const v = (body as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Prefer server `{ error: string }`, then `{ message: string }` (used by some
 * admin auth responses), then a generic HTTP message.
 */
export function messageFromApiResponse(
  res: Response,
  body: unknown,
  fallbackWhenNotOk: string,
): string {
  const fromError = stringField(body, "error");
  if (fromError) return fromError;
  const fromMessage = stringField(body, "message");
  if (fromMessage) return fromMessage;
  if (!res.ok) {
    return `Request failed (HTTP ${res.status}).`;
  }
  return fallbackWhenNotOk;
}

export function messageFromUnknownError(
  e: unknown,
  fallback = "Something went wrong.",
): string {
  return e instanceof Error && e.message.trim() ? e.message : fallback;
}
