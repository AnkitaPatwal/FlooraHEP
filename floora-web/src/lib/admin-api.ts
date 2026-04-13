import { supabase } from "../lib/supabase-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type PendingClient = {
  user_id: number;
  email: string;
  fname: string;
  lname: string;
  status: boolean;
};

/** Same shape as PendingClient; used for approved users (status === true). */
export type ActiveClient = PendingClient;

function ensureEnv(): void {
  if (!url || !anon) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to floora-web/.env"
    );
  }
}

async function invoke(body: Record<string, unknown>): Promise<unknown> {
  ensureEnv();
  const res = await fetch(`${url}/functions/v1/admin-approval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Fetches client accounts with pending status (status === false) from the backend.
 */
export async function fetchPendingClients(): Promise<PendingClient[]> {
  const data = await invoke({});
  if (!Array.isArray(data)) return [];
  return data as PendingClient[];
}

/**
 * Fetches client accounts with approved status (status === true) from the backend.
 */
export async function fetchActiveClients(): Promise<ActiveClient[]> {
  const data = await invoke({ list: "approved" });
  if (!Array.isArray(data)) return [];
  return data as ActiveClient[];
}

/**
 * Approves a pending client.
 */
export async function approveClient(
  adminId: number,
  userId: number
): Promise<void> {
  try {
    await invoke({ action: "approve", admin_id: adminId, user_id: userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Not Found" || (msg && msg.includes("404"))) {
      throw new Error(
        "Approve failed: admin-approval function not found. Deploy the Edge Function (see backend/supabase/functions/admin-approval) and ensure VITE_SUPABASE_URL points to your project."
      );
    }
    throw err;
  }
}

/**
 * Denies a pending client.
 */
export async function denyClient(
  adminId: number,
  userId: number
): Promise<void> {
  await invoke({ action: "deny", admin_id: adminId, user_id: userId });
}

/**
 * Deletes an active client.
 */
export async function deleteClient(
  adminId: number,
  userId: number
): Promise<void> {
  await invoke({ action: "delete", admin_id: adminId, user_id: userId });
}

/**
 * Uploads an exercise video. Uses Supabase session token for auth.
 */
export async function uploadExerciseVideo(
  exerciseId: number,
  file: File
): Promise<{ ok: true; video_id: number; publicUrl: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(
    `${API_BASE}/api/admin/exercises/${exerciseId}/video`,
    {
      method: "POST",
      body: form,
      headers: {
        "x-uploader-user-id": "56",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
    }
  );

  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  if (!res.ok) throw new Error(body?.message || `Upload failed (${res.status})`);
  return body;
}