import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { supabase } from "../../lib/supabase-client";
import "./Dashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

type DashboardPayload = {
  counts: {
    totalUsers: number;
    pendingUsers: number;
    plans: number;
    sessions: number;
    exercises: number;
  };
  topPlans: {
    plan_id: number;
    title: string;
    assigned_users: number;
    last_edited_at: string;
  }[];
  userOverview: {
    user_id: number;
    display_name: string;
    plan_title: string | null;
    start_date: string | null;
    status: "active" | "inactive";
  }[];
  recentActivity: { at: string; label: string }[];
};

function formatListUpdated(d: Date): string {
  return `Last updated: ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatPlanEdited(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const location = useLocation();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, { headers });
      const body = (await res.json().catch(() => null)) as
        | DashboardPayload
        | { error?: string }
        | null;
      if (!res.ok) {
        setLoadError(
          (body && "error" in body && body.error) ||
            `Dashboard failed (${res.status})`,
        );
        return;
      }
      if (!body || !("counts" in body)) {
        setLoadError("Invalid dashboard response.");
        return;
      }
      setData(body as DashboardPayload);
      setLastUpdated(new Date());
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load dashboard data.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  // Refetch whenever this screen is visited (e.g. Users → Dashboard). `location.key`
  // changes on each navigation entry, including returning from another admin page.
  useEffect(() => {
    void load();
  }, [location.key, load]);

  const stat = useMemo(() => {
    const fmt = (n: number | null | undefined) =>
      n === null || n === undefined ? (
        <span className="dashboard-stat-value--muted">—</span>
      ) : (
        n
      );
    return fmt;
  }, []);

  const c = data?.counts;

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-updated">{formatListUpdated(lastUpdated)}</p>
        </header>

        {loadError && (
          <p className="dashboard-error" role="alert">
            {loadError}
          </p>
        )}

        {busy && !data && !loadError && (
          <p className="dashboard-loading-hint" aria-live="polite">
            Loading dashboard…
          </p>
        )}

        <section className="dashboard-stats" aria-label="Summary statistics">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-label">Total users</span>
            <p className="dashboard-stat-value">{stat(c?.totalUsers)}</p>
          </article>
          <article className="dashboard-stat-card dashboard-stat-card--pending">
            <span className="dashboard-stat-label">Pending</span>
            <p className="dashboard-stat-value">{stat(c?.pendingUsers)}</p>
          </article>
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-label">Active plans</span>
            <p className="dashboard-stat-value">{stat(c?.plans)}</p>
          </article>
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-label">Sessions</span>
            <p className="dashboard-stat-value">{stat(c?.sessions)}</p>
          </article>
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-label">Exercises</span>
            <p className="dashboard-stat-value">{stat(c?.exercises)}</p>
          </article>
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-col">
            <section className="dashboard-card dashboard-card--scrollable">
              <h2 className="dashboard-card-title">User overview</h2>
              {!data?.userOverview?.length ? (
                <p className="dashboard-empty-hint dashboard-empty-hint--flush">
                  No active users to show.
                </p>
              ) : (
                <div
                  className="dashboard-card-scroll"
                  tabIndex={0}
                  aria-label="User overview list"
                >
                  {data.userOverview.map((u) => (
                    <div key={u.user_id} className="dashboard-user-row">
                      <div className="dashboard-user-row-main">
                        <span className="dashboard-user-name">
                          {u.display_name}
                        </span>
                        <span className="dashboard-user-meta">
                          {u.plan_title ?? "No plan assigned"}
                          {u.start_date
                            ? ` · Start ${formatPlanEdited(u.start_date)}`
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`dashboard-badge dashboard-badge--${u.status === "active" ? "active" : "inactive"}`}
                      >
                        {u.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-card dashboard-card--scrollable">
              <h2 className="dashboard-card-title">Active plans</h2>
              {!data?.topPlans?.length ? (
                <p className="dashboard-empty-hint dashboard-empty-hint--flush">
                  No plans in the library yet.
                </p>
              ) : (
                <div
                  className="dashboard-card-scroll dashboard-card-scroll--plans"
                  tabIndex={0}
                  aria-label="Active plans list"
                >
                  {data.topPlans.map((p) => (
                    <div key={p.plan_id} className="dashboard-plan-row">
                      <div className="dashboard-plan-row-main">
                        <span className="dashboard-plan-name">{p.title}</span>
                        <span className="dashboard-plan-sub">
                          Last edited {formatPlanEdited(p.last_edited_at)}
                        </span>
                      </div>
                      <span className="dashboard-plan-meta">
                        {p.assigned_users}{" "}
                        {p.assigned_users === 1 ? "user" : "users"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-col dashboard-col--activity">
            <section className="dashboard-card dashboard-card--scrollable">
              <h2 className="dashboard-card-title">Recent activity</h2>
              {!data?.recentActivity?.length ? (
                <p className="dashboard-empty-hint dashboard-empty-hint--flush">
                  No recent activity yet. Added, edited, and deleted items
                  (clients, plans, sessions, exercises) will show here after
                  you use the admin tools.
                </p>
              ) : (
                <div
                  className="dashboard-card-scroll dashboard-card-scroll--tall"
                  tabIndex={0}
                  aria-label="Recent activity list"
                >
                  <ul className="dashboard-activity-list">
                    {data.recentActivity.map((row, i) => (
                      <li
                        key={`${row.at}-${i}`}
                        className="dashboard-activity-item"
                      >
                        <span className="dashboard-activity-date">
                          {formatShortDate(row.at)}
                        </span>
                        <span
                          className="dashboard-activity-dot-wrap"
                          aria-hidden
                        >
                          <span className="dashboard-activity-dot" />
                        </span>
                        <p className="dashboard-activity-text">{row.label}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
