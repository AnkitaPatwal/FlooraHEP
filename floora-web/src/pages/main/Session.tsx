import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Session.css";
import { useEffect, useState } from "react";
import sessionImg from "../../assets/exercise.jpg";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";

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
};

function Session() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadModules = async () => {
    setLoadingModules(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, { method: "GET", headers });
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
  }, []);

  const filteredModules = modules.filter(
    (m) => !search.trim() || m.title.toLowerCase().includes(search.toLowerCase())
  );
  const groupedBySession = filteredModules.reduce((acc, m) => {
    const key = `Session ${m.session_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, Module[]>);

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
          Object.entries(groupedBySession).map(([category, items]) => (
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
                      src={sessionImg}
                      alt=""
                      className="session-image"
                    />
                    <div className="session-info">
                      <h3>{module.title}</h3>
                      <p>Session {module.session_number}</p>
                      <span className="session-tag">
                        <span className="material-symbols-outlined">vital_signs</span>
                        {module.module_exercise?.length ?? 0} exercise
                        {(module.module_exercise?.length ?? 0) !== 1 ? "s" : ""}
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