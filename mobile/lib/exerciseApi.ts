/**
 * Fetch exercise (including video URL) from backend for mobile playback.
 */

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

const FETCH_TIMEOUT_MS = 12_000;

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ac.signal,
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetches the list of exercises from the backend (for use in grids/lists).
 */
export async function fetchExerciseList(): Promise<ExerciseListItem[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  const res = await fetchJsonWithTimeout(`${baseUrl}/api/exercises?pageSize=50`, {
    method: "GET",
  });
  if (!res) return [];

  if (!res.ok) return [];
  try {
    const json = (await res.json()) as { data?: ExerciseListItem[] };
    return Array.isArray(json.data) ? json.data : [];
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
  if (!baseUrl) return [];

  const numId = typeof moduleId === "string" ? parseInt(moduleId, 10) : moduleId;
  if (!Number.isInteger(numId) || numId <= 0) return [];

  const res = await fetch(`${baseUrl}/api/exercises/by-module/${numId}`, {
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
}

/**
 * Fetches a single exercise by id from the backend, including signed video URL.
 */
export async function fetchExerciseById(
  id: string | number
): Promise<ExerciseApiResponse | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  if (!Number.isInteger(numId) || numId <= 0) return null;

  const res = await fetchJsonWithTimeout(`${baseUrl}/api/exercises/${numId}`, {
    method: "GET",
  });
  if (!res) return null;

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
  return getBaseUrl() !== null;
}
