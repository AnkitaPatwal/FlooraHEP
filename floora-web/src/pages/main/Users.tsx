import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Users.css";

type User = {
  id: string;
  name: string;
  status: "pending" | "active";
  plan?: string;
  session?: string;
  avatarUrl?: string;
};

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name]
  );
  return url ? (
    <img className="user-avatar-img" src={url} alt={name} />
  ) : (
    <div className="user-avatar-fallback" aria-hidden>
      {initials}
    </div>
  );
}

function UserCard({ user, onClick }: { user: User; onClick?: () => void }) {
  return (
    <article className="user-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="user-card-inner">
        <div className="user-avatar-wrap">
          <Avatar name={user.name} url={user.avatarUrl} />
        </div>
        <div className="user-card-text">
          <h3 className="user-card-name">{user.name}</h3>
          <p className="user-card-muted">{user.plan ?? "No Plan"}</p>
          <p className="user-card-muted">{user.session ?? "No Session"}</p>
        </div>
      </div>
    </article>
  );
}

export default function Users() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:3000/api/admin/clients", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load clients (admin only)");
        }

        const json = await res.json();

        const mapped: User[] = (json.clients ?? []).map((c: any) => ({
          id: String(c.id),
          name: c.name ?? "Unknown",
          status: c.status === "pending" ? "pending" : "active",
          plan: "No Plan",
          session: "No Session",
        }));

        setUsers(mapped);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load clients");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const pending = useMemo(
    () =>
      users.filter(
        (u) =>
          u.status === "pending" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q, users]
  );

  const active = useMemo(
    () =>
      users.filter(
        (u) =>
          u.status === "active" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q, users]
  );

  const handleCardClick = (u: User) => {
    // Keep your existing behavior
    if (u.id === "a1") navigate("/user-approval");
  };

  return (
    <AppLayout>
      <div className="user-page">
        <header className="user-header">
          <div className="user-header-left">
            <h1 className="user-title">Users</h1>
            <p className="user-count">{active.length} Active Users</p>
          </div>
          <button type="button" className="new-user-btn">
            + New User
          </button>
        </header>

        <hr className="user-divider" />

        {loading && <div className="user-empty">Loading...</div>}
        {error && <div className="user-empty">{error}</div>}

        <section className="user-section" aria-labelledby="pending-users-title">
          <h2 id="pending-users-title" className="user-section-title">
            Pending Users
          </h2>
          <div className="user-grid">
            {pending.length ? (
              pending.map((u) => <UserCard key={u.id} user={u} />)
            ) : (
              <div className="user-empty">No pending users</div>
            )}
          </div>
        </section>

        <section className="user-section" aria-labelledby="active-users-title">
          <div className="user-section-header">
            <h2 id="active-users-title" className="user-section-title">
              Active Users
            </h2>
            <div className="user-search-wrap">
              <span className="user-search-icon" aria-hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="user-search-svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                  />
                </svg>
              </span>
              <input
                className="user-search-input"
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="user-grid">
            {active.length ? (
              active.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onClick={() => handleCardClick(u)}
                />
              ))
            ) : (
              <div className="user-empty">No active users</div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
