import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, authHeaders } from "./authHeaders";
import "./AssignPackage.css";

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

export default function AssignPackageUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setMessage("");
        setLoading(true);
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/assign-package/users`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load users.");
        }
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      displayName(u).toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div className="assign-package-page">
      <header className="assign-package-header">
        <div className="assign-package-header-left">
          <h1 className="assign-package-title">Assign Package</h1>
          <p className="assign-package-subtitle">
            {loading ? "Loading clients…" : `${users.length} Clients`}
          </p>
        </div>

        <div className="assign-package-search-wrap">
          <span className="assign-package-search-icon" aria-hidden>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="assign-package-search-svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
              />
            </svg>
          </span>
          <input
            className="assign-package-search-input"
            placeholder="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
            aria-label="Search clients"
          />
        </div>
      </header>

      <hr className="assign-package-divider" />

      {loading && <p className="assign-package-status">Loading clients…</p>}
      {message && (
        <p className="assign-package-status error" role="alert">
          {message}
        </p>
      )}

      {!loading && users.length === 0 && !message && (
        <p className="assign-package-status">
          No approved users with accounts found. Approve users in the database
          first, then refresh this page.
        </p>
      )}

      {!loading && users.length > 0 && filtered.length === 0 && (
        <p className="assign-package-status">No clients match your search.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="assign-package-grid" role="list" aria-label="Clients">
          {filtered.map((user) => (
            <Link
              key={user.id}
              to={user.id}
              className="assign-package-card"
              role="listitem"
            >
              <div className="assign-package-card-inner">
                <p className="assign-package-card-title">{displayName(user)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
