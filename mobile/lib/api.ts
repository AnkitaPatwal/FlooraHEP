/**
 * Backend API base URL for exercises etc.
 * Set EXPO_PUBLIC_API_URL in .env (e.g. http://localhost:3000 for dev, or your deployed backend).
 * On physical device/emulator use your machine IP (e.g. http://192.168.1.x:3000) or deployed URL.
 */
export function getApiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url && typeof url === "string" && url.trim()) {
    return url.trim().replace(/\/$/, "");
  }
  return null;
}

export type ExerciseFromApi = {
  exercise_id: number;
  title: string;
  description?: string | null;
  default_sets?: number | null;
  default_reps?: number | null;
  body_part?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ExercisesResponse = {
  data: ExerciseFromApi[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function fetchExercises(): Promise<ExerciseFromApi[]> {
  const base = getApiBase();
  if (!base) return [];
  const res = await fetch(`${base}/api/exercises?pageSize=50`);
  if (!res.ok) return [];
  const json = (await res.json()) as ExercisesResponse;
  return json.data ?? [];
}

export async function fetchExerciseById(id: number | string): Promise<ExerciseFromApi | null> {
  const base = getApiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/exercises/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as ExerciseFromApi;
}
