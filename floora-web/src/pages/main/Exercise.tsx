import AppLayout from "../../components/layouts/AppLayout";
import "../../components/main/Exercise.css";
import { useState, useEffect, useMemo } from "react";
import exerciseImg from "../../assets/exercise.jpg";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";

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
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

function ExerciseDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const debounce = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ pageSize: "100" });
        if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/exercises?${params}`, { headers });

        if (!res.ok) throw new Error(`Failed to fetch exercises (${res.status})`);

        const json = await res.json();
        setExercises(json.data || []);
        setError(null);
      } catch (err: unknown) {
        console.error("Failed to fetch exercises:", err);
        setError(err instanceof Error ? err.message : "Failed to load exercises");
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [debouncedSearchQuery, location.key]);

  const filteredExercises = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase();
    if (!q) return exercises;

    return exercises.filter((exercise) => {
      const title = (exercise.title ?? "").toLowerCase();
      const description = (exercise.description ?? "").toLowerCase();
      const bodyPart = (exercise.body_part ?? "").toLowerCase();
      const category = (exercise.category ?? "").toLowerCase();
      const tags = (exercise.tags ?? []).join(" ").toLowerCase();

      return (
        title.includes(q) ||
        description.includes(q) ||
        bodyPart.includes(q) ||
        category.includes(q) ||
        tags.includes(q)
      );
    });
  }, [exercises, debouncedSearchQuery]);

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const category = exercise.body_part || exercise.category || "Uncategorized";
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
              {loading ? "Loading..." : `${filteredExercises.length} Exercises`}
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
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      navigate(`/exercises/${exercise.exercise_id}`)
                    }
                  >
                    <img
                      src={exercise.thumbnail_url || exerciseImg}
                      alt={exercise.title}
                      className="exercise-image"
                    />
                    <div className="exercise-info">
                      <h3>{exercise.title}</h3>
                      <p>{exercise.body_part || exercise.category || "General"}</p>
                      {exercise.tags && exercise.tags.length > 0 && (
                        <div className="exercise-tags-row">
                          {exercise.tags.map((t) => (
                            <span key={t} className="exercise-tag-chip">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="exercise-tag">
                        <span className="material-symbols-outlined">
                          vital_signs
                        </span>
                        {exercise.default_sets != null &&
                        exercise.default_reps != null
                          ? `${exercise.default_sets} sets × ${exercise.default_reps} reps`
                          : "Varies"}
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