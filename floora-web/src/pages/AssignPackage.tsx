import { useCallback, useEffect, useRef, useState } from "react";
import { InlineMaterialDatePicker } from "../components/InlineMaterialDatePicker";

type User = {
  id: string;
  email: string | null;
};

type Plan = {
  plan_id: number;
  title: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const fetchWithAdminCookie = (url: string, init?: RequestInit) =>
  fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });

type AssignFeedback = { kind: "success" | "error"; text: string };

export default function AssignPackage() {
  const initialStart = todayLocalIsoDate();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(initialStart);
  /** Keeps latest date synchronously — avoids stale state when Assign is clicked right after typing in the date field (blur + click batched). */
  const startDateRef = useRef(initialStart);
  const setStartDateCommitted = useCallback((iso: string) => {
    startDateRef.current = iso;
    setStartDate(iso);
  }, []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<AssignFeedback | null>(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        setLoadingLists(true);

        const headers = await authHeaders();

        const [usersRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/api/assign-package/users`, { headers }),
          fetch(`${API_BASE}/api/assign-package/plans`, { headers }),
        ]);

        const usersData = await usersRes.json();
        const plansData = await plansRes.json();

        if (!usersRes.ok) {
          throw new Error(
            usersData.error ||
              "The user list could not be loaded. Try signing in again."
          );
        }

        if (!plansRes.ok) {
          throw new Error(
            plansData.error ||
              "The plan list could not be loaded. Try signing in again."
          );
        }

        setUsers(Array.isArray(usersData) ? usersData : []);
        setPlans(Array.isArray(plansData) ? plansData : []);
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "Could not load users or plans. Check your connection and try again."
        );
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
  }, []);

  const handleAssign = async () => {
    setAssignFeedback(null);

    const effectiveStart = startDateRef.current;

    if (!userId || !planId || !effectiveStart) {
      setAssignFeedback({
        kind: "error",
        text: "Please select a user, a plan, and a start date before assigning.",
      });
      return;
    }

    try {
      setLoading(true);

      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/assign-package`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: userId,
            package_id: Number(planId),
            start_date: effectiveStart,
          }),
        }
      );

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON body
      }

      if (!res.ok) {
        setAssignFeedback({
          kind: "error",
          text:
            (typeof data.error === "string" && data.error) ||
            "Could not assign the package. Please try again.",
        });
        return;
      }

      setAssignFeedback({
        kind: "success",
        text: `Package assigned successfully. Program start date: ${effectiveStart}.`,
      });
      setUserId("");
      setPlanId("");
      const next = todayLocalIsoDate();
      startDateRef.current = next;
      setStartDate(next);
    } catch {
      setAssignFeedback({
        kind: "error",
        text: "Network error. Check your connection, confirm you are still signed in, and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 480 }}>
      <h1 style={{ fontWeight: 600, margin: "0 0 20px", fontFamily: "'Poppins', sans-serif" }}>
        Assign Package
      </h1>

      {loadError && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            fontWeight: 600,
            color: "#8b1538",
            background: "#fde8ec",
          }}
        >
          Could not load this page. {loadError}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="assign-user">User</label>
        <br />
        <select
          id="assign-user"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={loadingLists}
          style={{ width: "100%", maxWidth: 400, minHeight: 36 }}
        >
          <option value="">
            {loadingLists ? "Loading users…" : "Select user"}
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.id}
            </option>
          ))}
        </select>
        {!loadingLists && users.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
            No approved users with accounts found. Approve users in the database
            first, then refresh this page.
          </p>
        )}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="assign-plan">Plan</label>
        <br />
        <select
          id="assign-plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          disabled={loadingLists}
          style={{ width: "100%", maxWidth: 400, minHeight: 36 }}
        >
          <option value="">
            {loadingLists ? "Loading plans…" : "Select plan"}
          </option>
          {plans.map((plan) => (
            <option key={plan.plan_id} value={String(plan.plan_id)}>
              {plan.title}
            </option>
          ))}
        </select>
        {!loadingLists && plans.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
            No plans found. Create a plan in the plan dashboard first.
          </p>
        )}
      </div>

      <div style={{ marginBottom: "16px", width: "100%", maxWidth: 400 }}>
        <label htmlFor="start-date" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Program start date
        </label>
        <InlineMaterialDatePicker
          id="start-date"
          value={startDate}
          onChange={setStartDateCommitted}
          disabled={loadingLists}
        />
      </div>

      <button
        type="button"
        onClick={handleAssign}
        disabled={loading || loadingLists}
        style={{
          marginTop: 4,
          padding: "12px 22px",
          borderRadius: 8,
          border: "none",
          background: "#0D2C2C",
          color: "#fff",
          fontFamily: "'Poppins', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.1em",
          cursor: loading || loadingLists ? "not-allowed" : "pointer",
          opacity: loading || loadingLists ? 0.65 : 1,
        }}
      >
        {loading ? "Assigning…" : "Assign Package"}
      </button>

      {assignFeedback && (
        <p
          role={assignFeedback.kind === "error" ? "alert" : "status"}
          aria-live="polite"
          style={{
            marginTop: 16,
            marginBottom: 0,
            padding: 12,
            borderRadius: 8,
            fontWeight: 600,
            ...(assignFeedback.kind === "success"
              ? { color: "#0d5c2f", background: "#e6f4ea" }
              : { color: "#8b1538", background: "#fde8ec" }),
          }}
        >
          {assignFeedback.text}
        </p>
      )}
    </div>
  );
}