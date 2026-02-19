const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type PendingClient = {
  user_id: number;
  email: string;
  fname: string;
  lname: string;
  status: boolean;
};

/**
 * Fetches client accounts with pending status from the backend.
 */
export async function fetchPendingClients(): Promise<PendingClient[]> {
  if (!url || !anon) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to floora-web/.env"
    );
  }

  const res = await fetch(`${url}/functions/v1/admin-approval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const msg =
      (body as { error?: string })?.error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (!Array.isArray(body)) {
    return [];
  }

  return body as PendingClient[];
}
