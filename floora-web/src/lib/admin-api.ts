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
 * Approves a pending client. Updates the client's status to true in the database.
 * @param adminId - Admin user_id (e.g. from session; use 1 if not yet wired to auth).
 * @param userId - Client user_id to approve.
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
 * Denies a pending client. Logs the action; client remains or is set to not approved.
 * @param adminId - Admin user_id.
 * @param userId - Client user_id to deny.
 */
export async function denyClient(
  adminId: number,
  userId: number
): Promise<void> {
  await invoke({ action: "deny", admin_id: adminId, user_id: userId });
}

/**
 * Deletes an active client. Removes the user from public.user and from auth.
 * @param adminId - Admin user_id.
 * @param userId - Client user_id to delete.
 */
export async function deleteClient(
  adminId: number,
  userId: number
): Promise<void> {
  await invoke({ action: "delete", admin_id: adminId, user_id: userId });
}
