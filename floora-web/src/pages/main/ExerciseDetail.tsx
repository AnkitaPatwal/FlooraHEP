import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase-client";
import "../../components/main/CreateExercise.css";
import "../../components/main/Exercise.css";
import "./CreatePlan.css";
import "./CreateSession.css";
import "./ExerciseDetail.css";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

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
  assigned_user_count?: number | null;
  assigned_count_rpc_unavailable?: boolean;
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
        <div className="exercise-detail-page ce-page--mock">
          <p className="ce-loading-text">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!exercise) {
    return (
      <AppLayout>
        <div className="exercise-detail-page ce-page--mock create-plan-page--unified">
          <div className="ce-content">
            <div className="exercise-detail-error">{error || "Exercise not found"}</div>
            <button
              type="button"
              className="back-btn back-btn--v2 create-plan-back-btn"
              onClick={() => navigate("/exercise-dashboard")}
            >
              Back to exercises
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="exercise-detail-page ce-page--mock create-plan-page--unified">
        <div className="ce-content">
          {successMessage && (
            <div className="message-banner success-banner">{successMessage}</div>
          )}
          {error && (
            <div className="message-banner error-banner">{error}</div>
          )}

          <header className="create-session-header create-session-header--v2 create-plan-page-header exercise-detail-header exercise-detail-header--actions-right">
            <div className="create-session-header-right">
              {!isAuthLoading && isSuperAdmin && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={deleting}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className="back-btn back-btn--v2 create-plan-back-btn"
                onClick={() => navigate("/exercise-dashboard")}
                disabled={deleting}
              >
                Back
              </button>
              {!isAuthLoading && isSuperAdmin && (
                <button type="button" className="save-btn create-plan-save-btn" onClick={handleEdit}>
                  Edit
                </button>
              )}
            </div>
          </header>

          <div className="exercise-detail-body">
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

            <div className="exercise-detail-info">
              <header className="exercise-detail-info-hero">
                <h1 className="exercise-detail-title">{exercise.title}</h1>
                {exercise.body_part && (
                  <p className="exercise-detail-category">{exercise.body_part}</p>
                )}
              </header>

              {exercise.assigned_count_rpc_unavailable && (
                <div className="exercise-assignment-counts-banner exercise-assignment-counts-banner--critical" role="alert">
                  Plan-based client counts are unavailable (database function missing or failed). Run migrations
                  including <code>20260412000000_count_assigned_clients_per_exercise.sql</code> on Supabase,
                  then restart the API. The number shown may not include assigned plans.
                </div>
              )}

              {(exercise.default_sets != null || exercise.default_reps != null) && (
                <section className="exercise-detail-section" aria-label="Default sets and reps">
                  <p className="exercise-detail-label">Sets × Reps</p>
                  <p className="exercise-detail-value">
                    {exercise.default_sets ?? "—"} sets × {exercise.default_reps ?? "—"} reps
                  </p>
                </section>
              )}

              <section className="exercise-detail-section" aria-label="Description">
                <p className="exercise-detail-label">Description</p>
                <p className="exercise-detail-prose">
                  {exercise.description?.trim() || "No description added yet."}
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Remove Exercise"
        message="Are you sure you want to delete this exercise?"
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}

export default ExerciseDetail;
