/**
 * Fetch exercise (including video URL) from backend for mobile playback.
 */

const DEFAULT_FETCH_TIMEOUT_MS = 6000;

function isReactNativeRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as { product?: string }).product === "ReactNative"
  );
}

/** RFC1918 / loopback hosts the phone cannot reach when off the same LAN. */
function isLikelyUnreachableLanHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  const parts = hostname.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function shouldSkipBackendForUnreachableLan(baseUrl: string): boolean {
  if (process.env.EXPO_PUBLIC_USE_LOCAL_EXERCISE_API === "true") return false;
  if (!isReactNativeRuntime()) return false;
  try {
    const host = new URL(baseUrl).hostname;
    return isLikelyUnreachableLanHost(host);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type ExerciseApiResponse = {
  exercise_id: number;
  title: string;
  description: string;
  video_url: string | null;
};

export type ExerciseListItem = ExerciseApiResponse;

const getBaseUrl = (): string | null => {
  const url = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (typeof url === "string" && url.trim()) return url.trim().replace(/\/$/, "");
  return null;
};

/**
 * Fetches the list of exercises from the backend (for use in grids/lists).
 */
export async function fetchExerciseList(): Promise<ExerciseListItem[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || shouldSkipBackendForUnreachableLan(baseUrl)) return [];

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/exercises?pageSize=50`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    try {
      const json = (await res.json()) as { data?: ExerciseListItem[] };
      return Array.isArray(json.data) ? json.data : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Fetches exercises mapped to a specific module/session.
 */
export async function fetchExerciseListByModule(
  moduleId: string | number
): Promise<ExerciseListItem[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || shouldSkipBackendForUnreachableLan(baseUrl)) return [];

  const numId = typeof moduleId === "string" ? parseInt(moduleId, 10) : moduleId;
  if (!Number.isInteger(numId) || numId <= 0) return [];

  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/exercises/by-module/${numId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    try {
      const json = (await res.json()) as { data?: ExerciseListItem[] };
      return Array.isArray(json.data) ? json.data : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Fetches a single exercise by id from the backend, including signed video URL.
 */
export async function fetchExerciseById(
  id: string | number
): Promise<ExerciseApiResponse | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || shouldSkipBackendForUnreachableLan(baseUrl)) return null;

  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  if (!Number.isInteger(numId) || numId <= 0) return null;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${baseUrl}/api/exercises/${numId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof (data as { message?: string }).message === "string") {
        message = (data as { message: string }).message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await res.json()) as ExerciseApiResponse;
  return data;
}

/**
 * Returns whether the app is configured to use the backend for exercises (and video URLs).
 */
export function isExerciseApiConfigured(): boolean {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return false;
  if (shouldSkipBackendForUnreachableLan(baseUrl)) return false;
  return true;
}
