import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import "../../components/main/Exercise.css";
import "./ExerciseDetail.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

interface Exercise {
  exercise_id: number;
  title: string;
  description?: string;
  body_part?: string;
  default_sets?: number;
  default_reps?: number;
  video_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  assigned_user_count?: number;
}

function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercise = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/exercises/${id}`, { headers });
        if (!res.ok) {
          if (res.status === 404) throw new Error("Exercise not found");
          throw new Error(`Failed to load (${res.status})`);
        }
        const data = await res.json();
        setExercise(data);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load exercise");
      } finally {
        setLoading(false);
      }
    };
    fetchExercise();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !deleteConfirm) return;
    try {
      setDeleting(true);
      setError(null);
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/exercises/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || "Delete failed");
      }
      setSuccessMessage("Exercise deleted successfully");
      setTimeout(() => navigate("/exercise-dashboard", { replace: true }), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    navigate(`/exercises/${id}/edit`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="exercise-detail-page">
          <p className="exercise-detail-loading">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!exercise) {
    return (
      <AppLayout>
        <div className="exercise-detail-page">
          <div className="exercise-detail-error">{error || "Exercise not found"}</div>
          <button
            className="exercise-detail-back"
            onClick={() => navigate("/exercise-dashboard")}
          >
            Back to Exercises
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="exercise-detail-page">
        {successMessage && (
          <div className="message-banner success-banner">{successMessage}</div>
        )}
        {error && (
          <div className="message-banner error-banner">{error}</div>
        )}
        <div className="exercise-detail-main">
          <div className="exercise-detail-content">
            <header className="exercise-detail-header">
              <button
                className="exercise-detail-back"
                onClick={() => navigate("/exercise-dashboard")}
              >
                ← Back
              </button>
            </header>

            <div className="exercise-detail-video-section">
              {exercise.video_url ? (
                <video
                  src={exercise.video_url}
                  controls
                  className="exercise-detail-video"
                  poster={exercise.thumbnail_url}
                />
              ) : (
                <div className="exercise-detail-no-video">No video</div>
              )}
            </div>

            <h1 className="exercise-detail-title">{exercise.title}</h1>

            {exercise.body_part && (
              <p className="exercise-detail-category">{exercise.body_part}</p>
            )}

            {exercise.tags && exercise.tags.length > 0 && (
              <div className="exercise-detail-tags">
                {exercise.tags.map((t) => (
                  <span key={t} className="exercise-detail-tag">{t}</span>
                ))}
              </div>
            )}

            {(exercise.default_sets != null || exercise.default_reps != null) && (
              <div className="exercise-detail-meta">
                <span className="exercise-detail-meta-label">Sets × Reps</span>
                <span className="exercise-detail-meta-value">
                  {exercise.default_sets ?? "—"} sets × {exercise.default_reps ?? "—"} reps
                </span>
              </div>
            )}

            <div className="exercise-detail-description">
              <h3>Description</h3>
              <p>{exercise.description || "No description."}</p>
            </div>
          </div>

          {!isAuthLoading && isSuperAdmin && (
            <aside className="exercise-detail-actions-panel">
              {!deleteConfirm ? (
                <div className="exercise-detail-actions-row">
                  <button
                    type="button"
                    className="exercise-detail-edit-btn"
                    onClick={handleEdit}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="exercise-detail-delete-btn"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <div className="exercise-detail-delete-confirm">
                  <span>
                    {exercise.assigned_user_count ?? 0} users are assigned this exercise. Do you want to delete it?
                  </span>
                  <div className="exercise-detail-delete-buttons">
                    <button
                      type="button"
                      className="exercise-detail-delete-yes"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      className="exercise-detail-delete-no"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default ExerciseDetail;