import AppLayout from "../../components/layouts/AppLayout";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import "../../components/main/Exercise.css";
import { useState, useEffect, useSyncExternalStore } from "react";
import exerciseImg from "../../assets/exercise.jpg";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import { useAssignmentCountsRefresh } from "../../hooks/useAssignmentCountsRefresh";
import {
  getAssignmentCountsVersion,
  subscribeAssignmentCountsVersion,
} from "../../lib/assignmentCountsVersionStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

export interface Exercise {
  exercise_id: number;
  title: string;
  description?: string;
  body_part?: string;
  category?: string;
  default_sets?: number;
  default_reps?: number;
  video_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  /** Distinct clients (assigned packages / overrides); null when counts failed to load */
  assigned_user_count?: number | null;
}

function clientsAssignedLabel(count: number): string {
  return count === 1 ? "1 client assigned" : `${count} clients assigned`;
}

/** List grouping + card subtitle: API stores category as `body_part`; prefer `category` if present. */
function exerciseListCategory(e: Exercise): string {
  const raw = (e.category ?? e.body_part)?.trim();
  return raw || "Uncategorized";
}

function ExerciseDashboard() {
  const navigate = useNavigate();
  const { location, refreshToken } = useAssignmentCountsRefresh();
  const countsVersion = useSyncExternalStore(
    subscribeAssignmentCountsVersion,
    getAssignmentCountsVersion,
    getAssignmentCountsVersion,
  );
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentCountsError, setAssignmentCountsError] = useState(false);
  const [assignmentCountsRpcUnavailable, setAssignmentCountsRpcUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ pageSize: "100" });
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/exercises?${params}`, {
          headers,
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`Failed to fetch exercises (${res.status})`);

        const json = await res.json();
        setExercises(json.data || []);
        setAssignmentCountsError(Boolean(json.meta?.assignmentCountsError));
        setAssignmentCountsRpcUnavailable(Boolean(json.meta?.assignmentCountsRpcUnavailable));
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch exercises:", err);
        setError(err instanceof Error ? err.message : "Failed to load exercises");
      } finally {
        setLoading(false);
      }
    };

    void fetchExercises();
  }, [debouncedSearch, location.key, refreshToken, countsVersion]);

  const groupedExercises = exercises.reduce((acc, exercise) => {
    const category = exerciseListCategory(exercise);
    if (!acc[category]) acc[category] = [];
    acc[category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <AppLayout>
      <div className="exercise-page">
        <header className="exercise-header">
          <div className="exercise-header-left">
            <h1 className="exercise-title">Exercises</h1>
            <p className="exercise-count">
              {loading ? "Loading..." : `${exercises.length} Exercises`}
            </p>
            {!isAuthLoading && isSuperAdmin && (
              <Link to="/exercises/create">
                <button className="new-exercise-btn">+ New Exercise</button>
              </Link>
            )}
          </div>

          <div className="exercise-header-right">
            <div className="search-wrapper">
              <span className="search-icon">
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
                className="search-bar"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <hr className="divider" />

        {error && (
          <div
            style={{
              padding: "20px",
              color: "#b91c1c",
              backgroundColor: "#fee",
              borderRadius: "8px",
              margin: "20px 0",
            }}
          >
            {error}
          </div>
        )}

        {assignmentCountsRpcUnavailable && !error && !loading && (
          <div className="exercise-assignment-counts-banner exercise-assignment-counts-banner--critical" role="alert">
            Plan-based client counts are unavailable (database function missing or error). Run migrations
            including <code>20260412000000_count_assigned_clients_per_exercise.sql</code> on your Supabase
            project, then restart the API. Until then, numbers may stay at 0 even after you assign plans.
          </div>
        )}

        {assignmentCountsError && !assignmentCountsRpcUnavailable && !error && !loading && (
          <div className="exercise-assignment-counts-banner" role="alert">
            Could not load client assignment counts. The exercise list is still shown; refresh the page to try again.
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Loading exercises...
          </div>
        )}

        {!loading &&
          !error &&
          Object.entries(groupedExercises).map(([category, items]) => (
            <section className="category-section" key={category}>
              <h2 className="category-title">
                {category} <span>{items.length} Exercises</span>
              </h2>
              <div className="exercise-grid">
                {items.map((exercise) => (
                  <div
                    className="exercise-card"
                    key={exercise.exercise_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/exercises/${exercise.exercise_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/exercises/${exercise.exercise_id}`);
                      }
                    }}
                  >
                    <img
                      src={exercise.thumbnail_url || exerciseImg}
                      alt={exercise.title}
                      className="exercise-image"
                    />
                    <div className="exercise-info">
                      <h3>{exercise.title}</h3>
                      <p className="exercise-info-category">{exerciseListCategory(exercise)}</p>
                      <span className="exercise-tag" aria-live="polite">
                        <AssignmentPulseIcon className="assignment-count-pulse-icon" />
                        {assignmentCountsError ? (
                          <span className="exercise-card-assignment-error">Count unavailable</span>
                        ) : (
                          clientsAssignedLabel(exercise.assigned_user_count ?? 0)
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </AppLayout>
  );
}

export default ExerciseDashboard;
