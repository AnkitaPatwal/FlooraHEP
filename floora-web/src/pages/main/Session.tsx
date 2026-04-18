import AppLayout from "../../components/layouts/AppLayout";
import "../../components/AdminInlineMessage.css";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import "../../components/main/Session.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import sessionImg from "../../assets/exercise.jpg";
import { Link, useNavigate } from "react-router-dom";
import {
  messageFromApiResponse,
  messageFromUnknownError,
  parseResponseJson,
} from "../../lib/api-errors";
import { supabase } from "../../lib/supabase-client";
import { useAssignmentCountsRefresh } from "../../hooks/useAssignmentCountsRefresh";
import {
  getAssignmentCountsVersion,
  subscribeAssignmentCountsVersion,
} from "../../lib/assignmentCountsVersionStore";

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

type SessionsBanner =
  | { variant: "error"; message: string }
  | { variant: "success"; message: string };

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
  const [banner, setBanner] = useState<SessionsBanner | null>(null);
  const [search, setSearch] = useState("");
  const expectSuccessAfterLoadRef = useRef(false);
  const successDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (successDismissTimerRef.current) {
        clearTimeout(successDismissTimerRef.current);
      }
    };
  }, []);

  const dismissBanner = useCallback(() => {
    if (successDismissTimerRef.current) {
      clearTimeout(successDismissTimerRef.current);
      successDismissTimerRef.current = null;
    }
    setBanner(null);
  }, []);

  const loadModules = useCallback(async () => {
    setLoadingModules(true);
    setBanner(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const body = await parseResponseJson(res);

      if (!res.ok) {
        expectSuccessAfterLoadRef.current = false;
        setBanner({
          variant: "error",
          message: messageFromApiResponse(
            res,
            body,
            "Could not load sessions.",
          ),
        });
        return;
      }

      if (!Array.isArray(body)) {
        expectSuccessAfterLoadRef.current = false;
        setBanner({
          variant: "error",
          message: "Received an unexpected response from the server.",
        });
        return;
      }

      setModules(body as Module[]);

      if (expectSuccessAfterLoadRef.current) {
        expectSuccessAfterLoadRef.current = false;
        if (successDismissTimerRef.current) {
          clearTimeout(successDismissTimerRef.current);
        }
        setBanner({ variant: "success", message: "Sessions refreshed." });
        successDismissTimerRef.current = setTimeout(() => {
          setBanner(null);
          successDismissTimerRef.current = null;
        }, 4000);
      }
    } catch (e) {
      expectSuccessAfterLoadRef.current = false;
      setBanner({
        variant: "error",
        message: messageFromUnknownError(e, "Could not load sessions."),
      });
    } finally {
      setLoadingModules(false);
    }
  }, [countsVersion, refreshToken]);

  const handleRetry = useCallback(() => {
    expectSuccessAfterLoadRef.current = true;
    void loadModules();
  }, [loadModules]);

  useEffect(() => {
    void loadModules();
  }, [location.key, loadModules]);

  function sessionCategoryLabel(m: Module): string {
    const c = m.description?.trim();
    return c || "Uncategorized";
  }

  const q = search.trim().toLowerCase();
  const filteredModules = modules.filter((m) => {
    if (!q) return true;
    const title = (m.title ?? "").toLowerCase();
    const cat = sessionCategoryLabel(m).toLowerCase();
    return title.includes(q) || cat.includes(q);
  });

  const groupedByCategory = filteredModules.reduce(
    (acc, m) => {
      const key = sessionCategoryLabel(m);
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    },
    {} as Record<string, Module[]>,
  );

  const sortedCategoryGroups = Object.entries(groupedByCategory)
    .map(
      ([label, items]) =>
        [
          label,
          [...items].sort((a, b) =>
            (a.title ?? "").localeCompare(b.title ?? ""),
          ),
        ] as const,
    )
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

        {banner && (
          <div
            className={`admin-inline-message admin-inline-message--${banner.variant}`}
            role={banner.variant === "error" ? "alert" : "status"}
            aria-live={banner.variant === "error" ? "assertive" : "polite"}
          >
            <p className="admin-inline-message__text">{banner.message}</p>
            <div className="admin-inline-message__actions">
              {banner.variant === "error" && (
                <button
                  type="button"
                  className="admin-inline-message__btn"
                  onClick={handleRetry}
                  disabled={loadingModules}
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                className="admin-inline-message__btn admin-inline-message__btn--ghost"
                onClick={dismissBanner}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {loadingModules ? (
          <p className="session-loading-hint">Loading sessions…</p>
        ) : filteredModules.length === 0 ? (
          <p className="session-empty">
            {search.trim()
              ? "No sessions match your search."
              : banner?.variant === "error"
                ? "Sessions could not be loaded. Use Retry above, or sign in again if you see an authorization message."
                : 'No sessions yet. Click "+ New Session" to create one.'}
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
                    onClick={() =>
                      navigate(`/sessions/${module.module_id}/edit`)
                    }
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
                      <p className="session-card-category">
                        {sessionCategoryLabel(module)}
                      </p>
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
