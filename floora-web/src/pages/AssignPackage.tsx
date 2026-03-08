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

export default function AssignPackage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setMessage("");

        const [usersRes, plansRes] = await Promise.all([
           fetch(`${API_BASE}/api/assign-package/users`),
  fetch(`${API_BASE}/api/assign-package/plans`),
  fetch(`${API_BASE}/api/assign-package/assign-package`)
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

    if (!userId || !packageId) {
      setMessage("Please select both user and package.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/admin/assign-package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          package_id: Number(packageId),
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

      <button onClick={handleAssign} disabled={loading}>
        {loading ? "Assigning..." : "Assign Package"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}