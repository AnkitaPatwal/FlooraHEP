import { useCallback, useEffect, useState } from "react";
import { API_BASE, authHeaders } from "./authHeaders";

type User = {
  id: string;
  email: string | null;
  full_name?: string;
};

function displayName(user: User): string {
  const n = user.full_name?.trim();
  if (n) return n;
  return user.email || user.id;
}

/**
 * Resolves the assignable patient display name for banners and headers.
 * Replace with a dedicated patient profile endpoint when available.
 */
export function usePatientLabel(userId: string | undefined) {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLabel(null);
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/assign-package/users`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setLabel(null);
        return;
      }
      const users = data as User[];
      const me = users.find((u) => u.id === userId);
      setLabel(me ? displayName(me) : null);
    } catch {
      setLabel(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { patientLabel: label, patientLabelLoading: loading, reloadPatientLabel: load };
}
