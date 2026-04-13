import AppLayout from "../../components/layouts/AppLayout";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import "../../components/main/Session.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import sessionImg from "../../assets/exercise.jpg";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import { useAssignmentCountsRefresh } from "../../hooks/useAssignmentCountsRefresh";
import {
  getAssignmentCountsVersion,
  subscribeAssignmentCountsVersion,
} from "../../lib/assignmentCountsVersionStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

type Exercise = {
  exercise_id: number;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
};

type ModuleExercise = {
  module_exercise_id: number;
  order_index: number;
  exercise: Exercise;
};

type Module = {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  module_exercise: ModuleExercise[];
  assigned_user_count?: number;
};

function clientsAssignedLabel(count: number): string {
  return count === 1 ? "1 client assigned" : `${count} clients assigned`;
}

function Session() {
  const navigate = useNavigate();
  const { location, refreshToken } = useAssignmentCountsRefresh();
  const countsVersion = useSyncExternalStore(
    subscribeAssignmentCountsVersion,
    getAssignmentCountsVersion,
    getAssignmentCountsVersion,
  );
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadModules = async () => {
    setLoadingModules(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setModules(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [location.key, refreshToken, countsVersion]);

  function sessionCategoryLabel(m: Module): string {
    const c = m.description?.trim();
    return c || "Uncategorized";
  }

  const q = search.trim().toLowerCase();
  const filteredModules = modules.filter((m) => {
    if (!q) return true;
    const title = m.title.toLowerCase();
    const cat = sessionCategoryLabel(m).toLowerCase();
    return title.includes(q) || cat.includes(q);
  });

  const groupedByCategory = filteredModules.reduce((acc, m) => {
    const key = sessionCategoryLabel(m);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, Module[]>);

  const sortedCategoryGroups = Object.entries(groupedByCategory)
    .map(([label, items]) => [
      label,
      [...items].sort((a, b) => a.title.localeCompare(b.title)),
    ] as const)
    .sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });

  return (
    <AppLayout>
      <div className="session-page">
        <header className="session-header">
          <div className="session-header-left">
            <h1 className="session-title">Sessions</h1>
            <p className="session-count">
              {loadingModules ? "…" : `${modules.length} Sessions`}
            </p>
            <Link to="/sessions/create">
              <button type="button" className="session-new-session-btn">
                + New Session
              </button>
            </Link>
          </div>
          <div className="session-header-right">
            <div className="session-search-wrapper">
              <span className="session-search-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="icon"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                className="session-search-bar"
                placeholder="Search sessions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </header>

        <hr className="session-divider" />

        {error && <div className="session-error">{error}</div>}

        {loadingModules ? (
          <p>Loading sessions…</p>
        ) : filteredModules.length === 0 ? (
          <p className="session-empty">
            No sessions yet. Click &quot;+ New Session&quot; to create one.
          </p>
        ) : (
          sortedCategoryGroups.map(([category, items]) => (
            <section className="session-category-section" key={category}>
              <h2 className="session-category-title">
                {category} <span>{items.length} Sessions</span>
              </h2>
              <div className="session-grid">
                {items.map((module) => (
                  <div
                    className="session-card"
                    key={module.module_id}
                    onClick={() => navigate(`/sessions/${module.module_id}/edit`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/sessions/${module.module_id}/edit`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={
                        [...(module.module_exercise ?? [])]
                          .sort((a, b) => a.order_index - b.order_index)[0]
                          ?.exercise?.thumbnail_url || sessionImg
                      }
                      alt=""
                      className="session-image"
                    />
                    <div className="session-info">
                      <h3>{module.title}</h3>
                      <p className="session-card-category">{sessionCategoryLabel(module)}</p>
                      <span className="session-tag">
                        <AssignmentPulseIcon className="assignment-count-pulse-icon" />
                        {clientsAssignedLabel(module.assigned_user_count ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </AppLayout>
  );
}

export default Session;