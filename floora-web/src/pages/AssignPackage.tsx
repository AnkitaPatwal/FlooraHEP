import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string | null;
};

type Plan = {
  plan_id: number;
  title: string;
};

const API_BASE = "http://localhost:3000";

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AssignPackage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState(todayLocalIsoDate);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setMessage("");

        const [usersRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/api/assign-package/users`, { credentials: "include" }),
          fetch(`${API_BASE}/api/assign-package/plans`, { credentials: "include" }),
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
          err instanceof Error ? err.message : "Failed to load users or packages."
        );
      }
    };

    loadData();
  }, []);

  const handleAssign = async () => {
    setMessage("");

    if (!userId || !packageId || !startDate) {
      setMessage("Please select user, package, and start date.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/assign-package/assign-package`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          package_id: Number(packageId),
          start_date: startDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to assign package.");
        return;
      }

      setMessage("Package assigned successfully.");
      setUserId("");
      setPackageId("");
      setStartDate(todayLocalIsoDate());
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>Assign Package</h1>

      <div style={{ marginBottom: "16px" }}>
        <label>User</label>
        <br />
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Select user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.id}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>Package</label>
        <br />
        <select value={packageId} onChange={(e) => setPackageId(e.target.value)}>
          <option value="">Select package</option>
          {plans.map((plan) => (
            <option key={plan.plan_id} value={plan.plan_id}>
              {plan.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="start-date">Start date</label>
        <br />
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <button onClick={handleAssign} disabled={loading}>
        {loading ? "Assigning..." : "Assign Package"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}