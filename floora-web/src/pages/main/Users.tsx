import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import {
  fetchActiveClients,
  fetchPendingClients,
  type ActiveClient,
  type PendingClient,
} from "../../lib/admin-api";
import "../../components/main/Users.css";

type User = {
  id: string;
  name: string;
  status: "active";
  plan?: string;
  session?: string;
  avatarUrl?: string;
  email?: string;
};

function toUser(c: ActiveClient): User {
  const name = [c.fname, c.lname].filter(Boolean).join(" ") || "—";
  return {
    id: String(c.user_id),
    name,
    status: "active",
    email: c.email,
  };
}

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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <article
      className="user-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
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

function PendingUserCard({
  client,
  onClick,
}: {
  client: PendingClient;
  onClick?: () => void;
}) {
  const name = [client.fname, client.lname].filter(Boolean).join(" ") || "—";
  return (
    <article className="user-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="user-card-inner">
        <div className="user-avatar-wrap">
          <Avatar name={name} />
        </div>
        <div className="user-card-text">
          <h3 className="user-card-name">{name}</h3>
          <p className="user-card-email">{client.email}</p>
        </div>
      </div>
    </article>
  );
}

export default function Users() {
  const [q, setQ] = useState("");
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [activeClients, setActiveClients] = useState<ActiveClient[]>([]);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const [deleteSuccessBanner, setDeleteSuccessBanner] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const loadPendingClients = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const list = await fetchPendingClients();
      setPendingClients(list);
    } catch (err) {
      setPendingError(
        err instanceof Error ? err.message : "Failed to load pending clients"
      );
      setPendingClients([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadActiveClients = useCallback(async () => {
    setActiveLoading(true);
    setActiveError(null);
    try {
      const list = await fetchActiveClients();
      setActiveClients(list);
    } catch (err) {
      setActiveError(
        err instanceof Error ? err.message : "Failed to load active users"
      );
      setActiveClients([]);
    } finally {
      setActiveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingClients();
    loadActiveClients();
  }, [loadPendingClients, loadActiveClients]);

  // Refetch lists when returning from approve/deny/delete so lists stay in sync
  useEffect(() => {
    if (location.state?.refreshUsers) {
      loadPendingClients();
      loadActiveClients();
      if (location.state?.deleteSuccess) setDeleteSuccessBanner(true);
      navigate("/users", { replace: true, state: {} });
    }
  }, [
    location.state?.refreshUsers,
    loadPendingClients,
    loadActiveClients,
    navigate,
    location.state?.deleteSuccess,
  ]);

  const pendingFiltered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return pendingClients;
    return pendingClients.filter((c) =>
      [c.fname, c.lname, c.email].some((s) =>
        (s ?? "").toLowerCase().includes(lower)
      )
    );
  }, [pendingClients, q]);

  // Only show approved users (status === true) in Active; exclude any pending that might slip through
  const activeUsers = useMemo(
    () => activeClients.filter((c) => c.status === true).map(toUser),
    [activeClients]
  );

  // Search by first name, last name, full name (any order), or email. Normalize whitespace so "John  Doe" matches "John Doe".
  const active = useMemo(() => {
    const normalizedQuery = q.trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalizedQuery) return activeUsers;

    const queryWords = normalizedQuery.split(" ").filter(Boolean);

    return activeUsers.filter((u) => {
      if (u.status !== "active") return false;
      if ((u.email ?? "").toLowerCase().includes(normalizedQuery)) return true;

      const client = activeClients.find((c) => String(c.user_id) === u.id);
      const fname = (client?.fname ?? "").trim().toLowerCase();
      const lname = (client?.lname ?? "").trim().toLowerCase();
      const fullNameNormalized = [fname, lname]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ");

      if (!fullNameNormalized)
        return u.name.toLowerCase().includes(normalizedQuery);

      // Match if the whole query is a substring, or every word in the query appears in the name (handles "John Doe", "Doe John", "John", "Doe")
      const fullQueryMatch = fullNameNormalized.includes(normalizedQuery);
      const allWordsMatch =
        queryWords.length > 0 &&
        queryWords.every((word) => fullNameNormalized.includes(word));

      return fullQueryMatch || allWordsMatch;
    });
  }, [activeUsers, activeClients, q]);

  const handlePendingCardClick = (client: PendingClient) => {
    navigate("/user-approval", { state: { user: client } });
  };

  const handleActiveCardClick = (user: User) => {
    const client = activeClients.find(
      (c) => c.status === true && String(c.user_id) === user.id
    );
    if (client) navigate("/user-profile", { state: { user: client } });
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

        {deleteSuccessBanner && (
          <div className="user-success-banner" role="status" aria-live="polite">
            Client deleted successfully. They have been removed from the list.
            <button
              type="button"
              className="user-success-dismiss"
              onClick={() => setDeleteSuccessBanner(false)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <section className="user-section" aria-labelledby="pending-users-title">
          <h2 id="pending-users-title" className="user-section-title">
            Pending Users
          </h2>

          {pendingError && (
            <div className="user-error-wrap">
              <p className="user-error" role="alert">
                {pendingError}
              </p>
              <p className="user-error-hint">
                Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                (same project where the function is deployed).
              </p>
              <button
                type="button"
                className="user-retry-btn"
                onClick={loadPendingClients}
              >
                Retry
              </button>
            </div>
          )}

          <div className="user-grid">
            {pendingLoading ? (
              <div className="user-empty">Loading pending users…</div>
            ) : pendingFiltered.length ? (
              pendingFiltered.map((c) => (
                <PendingUserCard
                  key={c.user_id}
                  client={c}
                  onClick={() => handlePendingCardClick(c)}
                />
              ))
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
            {activeLoading ? (
              <div className="user-empty">Loading active users…</div>
            ) : activeError ? (
              <div className="user-error-wrap">
                <p className="user-error" role="alert">
                  {activeError}
                </p>
                <button
                  type="button"
                  className="user-retry-btn"
                  onClick={loadActiveClients}
                >
                  Retry
                </button>
              </div>
            ) : active.length ? (
              active.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onClick={() => handleActiveCardClick(u)}
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