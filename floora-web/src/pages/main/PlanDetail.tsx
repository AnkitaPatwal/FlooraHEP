import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/layouts/AppLayout";
import { supabase } from "../../lib/supabase-client";
import sessionImg from "../../assets/exercise.jpg";
import "../../components/main/Plan.css";
import "../../components/main/Session.css";
import "./PlanDetail.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

type Module = {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
};

type ModuleWithExercises = Module & {
  module_exercise?: Array<{
    order_index: number;
    exercise?: { thumbnail_url?: string | null } | null;
  }>;
};

type PlanModule = {
  plan_module_id?: number;
  order_index: number;
  module: Module;
};

type Plan = {
  plan_id: number;
  title: string;
  description: string;
  category_id: number | null;
  plan_category: { category_id: number; name: string } | null;
  plan_module: PlanModule[];
};

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [thumbByModuleId, setThumbByModuleId] = useState<Record<number, string>>({});

  const planId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(planId)) {
        setError("Plan not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/admin/plans/${planId}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load plan");
        setPlan(data as Plan);
      } catch (e) {
        setPlan(null);
        setError(e instanceof Error ? e.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [planId]);

  useEffect(() => {
    const loadThumbs = async () => {
      if (!plan) return;
      const moduleIds = (plan.plan_module ?? [])
        .map((pm) => Number(pm.module?.module_id))
        .filter((n) => Number.isFinite(n));
      if (moduleIds.length === 0) return;

      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/admin/modules`, { headers });
        const data = await res.json();
        if (!res.ok) return;
        const rows = Array.isArray(data) ? (data as ModuleWithExercises[]) : [];

        const next: Record<number, string> = {};
        for (const m of rows) {
          if (!moduleIds.includes(Number(m.module_id))) continue;
          const first = [...(m.module_exercise ?? [])]
            .sort((a, b) => Number(a.order_index) - Number(b.order_index))[0];
          const url = String(first?.exercise?.thumbnail_url ?? "");
          if (url.startsWith("http")) next[Number(m.module_id)] = url;
        }
        setThumbByModuleId(next);
      } catch {
        // non-blocking
      }
    };

    void loadThumbs();
  }, [plan]);

  const orderedModules = useMemo(() => {
    const rows = plan?.plan_module ?? [];
    return [...rows].sort((a, b) => a.order_index - b.order_index);
  }, [plan?.plan_module]);

  const handleDelete = async () => {
    if (!planId || !deleteConfirm) return;
    try {
      setDeleting(true);
      setError(null);
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/admin/plans/${planId}`, { method: "DELETE", headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete plan");
      }
      navigate("/plan-dashboard", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete plan");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="plan-detail-page">
          <p className="plan-detail-loading">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout>
        <div className="plan-detail-page">
          <div className="plan-detail-error">{error || "Plan not found"}</div>
          <button className="plan-detail-back" onClick={() => navigate("/plan-dashboard")}>
            Back to Plans
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="plan-detail-page">
        {error ? <div className="message-banner error-banner">{error}</div> : null}

        <div className="detail-topbar">
          <button className="plan-detail-back" onClick={() => navigate("/plan-dashboard")}>
            ← Back
          </button>

          {!deleteConfirm ? (
            <div className="detail-topbar-actions">
              <button
                type="button"
                className="plan-detail-edit-btn"
                onClick={() => navigate(`/plan-dashboard/${plan.plan_id}/edit`)}
              >
                Edit
              </button>
              <button
                type="button"
                className="plan-detail-delete-btn"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="plan-detail-delete-confirm detail-topbar-confirm">
              <span>Delete this plan?</span>
              <div className="plan-detail-delete-buttons">
                <button
                  type="button"
                  className="plan-detail-delete-yes"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  type="button"
                  className="plan-detail-delete-no"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="plan-detail-main">
          <div className="plan-detail-content">
            <div className="plan-detail-hero">
              <div className="plan-detail-hero-inner">
                <div className="plan-detail-kicker">{plan.plan_category?.name ?? "Uncategorized"}</div>
                <h1 className="plan-detail-title">{plan.title}</h1>
              </div>
            </div>

            <div className="plan-detail-description">
              <h3>Description</h3>
              <p>{plan.description || "No description."}</p>
            </div>

            <div className="plan-detail-sessions">
              <h3>Sessions</h3>
              {orderedModules.length === 0 ? (
                <p className="plan-detail-muted">No sessions in this plan yet.</p>
              ) : (
                <div className="session-grid plan-detail-session-tiles" role="list" aria-label="Plan sessions">
                  {orderedModules.map((pm) => (
                    <div
                      key={`${plan.plan_id}-${pm.order_index}-${pm.module?.module_id}`}
                      className="session-card"
                      role="listitem"
                      style={{ cursor: "default" }}
                    >
                      <img
                        src={thumbByModuleId[pm.module.module_id] || sessionImg}
                        alt=""
                        className="session-image"
                      />
                      <div className="session-info">
                        <h3>{pm.module?.title ?? "Session"}</h3>
                        <p>Session {pm.module?.session_number ?? "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

