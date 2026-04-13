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

/**
 * Prefer server `{ error: string }`, then a generic HTTP message.
 */
export function messageFromApiResponse(
  res: Response,
  body: unknown,
  fallbackWhenNotOk: string,
): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim();
  }
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
