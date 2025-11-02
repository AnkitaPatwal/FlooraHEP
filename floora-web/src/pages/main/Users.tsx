import { useMemo, useState } from "react";
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

const SEED_USERS: User[] = [
  { id: "p1", name: "Loretta Barry", status: "pending", plan: "No Plan", session: "No Session" },
  { id: "p2", name: "Loretta Barry", status: "pending", plan: "No Plan", session: "No Session" },
  { id: "a1", name: "Catherine Becks", status: "active", plan: "Leakage", session: "Session 2", avatarUrl: "https://i.pravatar.cc/100?img=47" },
  { id: "a2", name: "Cindy Barlow", status: "active", plan: "Leakage", session: "Session 2", avatarUrl: "https://i.pravatar.cc/100?img=12" },
  { id: "a3", name: "Donna Paulsen", status: "active", plan: "Leakage", session: "Session 2", avatarUrl: "https://i.pravatar.cc/100?img=32" },
  { id: "a4", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a5", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a6", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
  { id: "a7", name: "Loretta Barry", status: "active", plan: "Leakage", session: "Session 2" },
];

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = useMemo(
    () => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    [name]
  );
  return url ? (
    <img className="user-avatar-img" src={url} alt={name} />
  ) : (
    <div className="user-avatar-fallback" aria-hidden>{initials}</div>
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
  const navigate = useNavigate();

  const pending = useMemo(
    () =>
      SEED_USERS.filter(
        (u) =>
          u.status === "pending" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q]
  );

  const active = useMemo(
    () =>
      SEED_USERS.filter(
        (u) =>
          u.status === "active" &&
          u.name.toLowerCase().includes(q.trim().toLowerCase())
      ),
    [q]
  );

  const handleCardClick = (u: User) => {
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
          <button type="button" className="new-user-btn">+ New User</button>
        </header>

        <hr className="user-divider" />

        <section className="user-section" aria-labelledby="pending-users-title">
          <h2 id="pending-users-title" className="user-section-title">Pending Users</h2>
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
            <h2 id="active-users-title" className="user-section-title">Active Users</h2>
            <div className="user-search-wrap">
              <span className="user-search-icon" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     className="user-search-svg">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"/>
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
