import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { supabase } from "../../lib/supabase-client";
import sessionImg from "../../assets/exercise.jpg";
import "../../components/main/Session.css";
import "./SessionDetail.css";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
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
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Module | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const moduleId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(moduleId)) {
        setError("Session not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/admin/modules`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load session");
        const list = Array.isArray(data) ? (data as Module[]) : [];
        const found = list.find((m) => Number(m.module_id) === moduleId) ?? null;
        if (!found) {
          setError("Session not found");
          setSession(null);
        } else {
          setSession(found);
        }
      } catch (e) {
        setSession(null);
        setError(e instanceof Error ? e.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [moduleId]);

  const orderedExercises = useMemo(() => {
    const rows = session?.module_exercise ?? [];
    return [...rows].sort((a, b) => a.order_index - b.order_index);
  }, [session?.module_exercise]);

  const sessionThumbnailUrl = orderedExercises[0]?.exercise?.thumbnail_url || sessionImg;

  const handleDelete = async () => {
    if (!moduleId) return;
    try {
      setDeleting(true);
      setError(null);
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/admin/modules/${moduleId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete session");
      navigate("/sessions", {
        replace: true,
        state: { deletedSession: true },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete session");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="session-detail-page">
          <p className="session-detail-loading">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="session-detail-page">
          <div className="session-detail-error">{error || "Session not found"}</div>
          <button className="session-detail-back" onClick={() => navigate("/sessions")}>
            Back to Sessions
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="session-detail-page">
        {error ? <div className="message-banner error-banner">{error}</div> : null}

        <div className="detail-topbar">
          <button className="session-detail-back" onClick={() => navigate("/sessions")}>
            ← Back
          </button>

          <div className="detail-topbar-actions">
            <button
              type="button"
              className="session-detail-edit-btn"
              onClick={() => navigate(`/sessions/${session.module_id}/edit`)}
            >
              Edit
            </button>
            <button
              type="button"
              className="session-detail-delete-btn"
              onClick={() => setDeleteConfirm(true)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className="session-detail-main">
          <div className="session-detail-content">
            <div className="session-detail-hero">
              <div className="session-detail-hero-inner">
                <img className="session-detail-hero-img" src={sessionThumbnailUrl} alt="" />
                <div className="session-detail-hero-title">
                  <div className="session-detail-kicker">Session {session.session_number}</div>
                  <h1 className="session-detail-title">{session.title}</h1>
                </div>
              </div>
            </div>

            <div className="session-detail-description">
              <h3>Description</h3>
              <p>{session.description || "No description."}</p>
            </div>

            <div className="session-detail-exercises">
              <h3>Exercises</h3>
              {orderedExercises.length === 0 ? (
                <p className="session-detail-muted">No exercises in this session yet.</p>
              ) : (
                <div
                  className="session-grid session-detail-exercise-tiles"
                  role="list"
                  aria-label="Session exercises"
                >
                  {orderedExercises.map((me) => (
                    <article
                      key={me.module_exercise_id}
                      className="session-card"
                      role="listitem"
                      style={{ cursor: "default" }}
                    >
                      <img
                        src={me.exercise?.thumbnail_url || sessionImg}
                        alt=""
                        className="session-image"
                      />
                      <div className="session-info">
                        <h3>{me.exercise?.title ?? "Exercise"}</h3>
                        <p>{me.exercise?.description?.trim() ? me.exercise.description : "No description."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Remove Session"
        message="Are you sure you want to delete this session?"
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
      />
    </AppLayout>
  );
}

