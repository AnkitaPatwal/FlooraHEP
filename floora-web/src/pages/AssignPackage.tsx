import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";

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

export default function AssignPackage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayLocalIsoDate);
  const [message, setMessage] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const loadData = async () => {
      try {
        setMessage("");
        setLoadingLists(true);

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };

        const [usersRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/api/assign-package/users`, { credentials: "include", headers }),
          fetch(`${API_BASE}/api/assign-package/plans`, { credentials: "include", headers }),
        ]);
        const usersData = await usersRes.json();
        const plansData = await plansRes.json();

        if (!usersRes.ok) {
          throw new Error(usersData.error || "Failed to load users.");
        }

        if (!plansRes.ok) {
          throw new Error(plansData.error || "Failed to load plans.");
        }

        setUsers(Array.isArray(usersData) ? usersData : []);
        setPlans(Array.isArray(plansData) ? plansData : []);
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Failed to load users or plans."
        );
      } finally {
        setLoadingLists(false);
      }
    };

    loadData();
  }, [accessToken]);

  const handleAssign = async () => {
    setMessage("");

    if (!userId || !planId || !startDate) {
      setMessage("Please select user, plan, and start date.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/assign-package/assign-package`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: userId,
          package_id: Number(planId),
          start_date: startDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to assign plan.");
        return;
      }

      setMessage("Plan assigned successfully.");
      setUserId("");
      setPlanId("");
      setStartDate(todayLocalIsoDate());
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 480 }}>
      <h1>Assign Plan</h1>

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

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="start-date">Start date</label>
        <br />
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={loadingLists}
          style={{ minHeight: 36 }}
        />
      </div>

      <button type="button" onClick={handleAssign} disabled={loading || loadingLists}>
        {loading ? "Assigning…" : "Assign Plan"}
      </button>

      {message && <p role="status">{message}</p>}
    </div>
  );
}
