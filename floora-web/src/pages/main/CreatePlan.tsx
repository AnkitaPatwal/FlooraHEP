import AppLayout from "../../components/layouts/AppLayout";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import sessionImg from "../../assets/exercise.jpg";
import "../../components/common/PlanSearchField.css";
import "./CreateSession.css";
import "./CreatePlan.css";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { StackedCardIllustration } from "../../components/main/StackedCardIllustration";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ModuleExercise = {
  module_exercise_id: number;
  order_index: number;
  exercise: {
    exercise_id: number;
    title: string;
    thumbnail_url?: string | null;
  };
};

export type PlanModule = {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  module_exercise: ModuleExercise[];
  assigned_user_count?: number;
};

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

function sessionCategoryLabel(m: PlanModule): string {
  const c = m.description?.trim();
  return c || "Uncategorized";
}

function moduleThumbnail(m: PlanModule): string {
  const ordered = [...(m.module_exercise ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
  const url = ordered[0]?.exercise?.thumbnail_url;
  return typeof url === "string" && url.trim() ? url.trim() : sessionImg;
}

function activeUsersLabel(count: number | null | undefined): string {
  if (count === null || count === undefined) return "—";
  return count === 1 ? "1 Active User" : `${count} Active Users`;
}

export default function CreatePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([]);
  const [modules, setModules] = useState<PlanModule[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");

  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/categories`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      /* non-blocking */
    }
  };

  const fetchModules = async () => {
    setLoadingModules(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, { headers, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setModules(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load sessions.");
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchPlan = async (planId: string) => {
    setLoadingPlan(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/plans/${planId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategoryName(data.plan_category?.name ?? "");
      if (Array.isArray(data.plan_module)) {
        const sorted = [...data.plan_module].sort(
          (a: { order_index?: number }, b: { order_index?: number }) =>
            (Number(a.order_index) || 0) - (Number(b.order_index) || 0),
        );
        setSelectedModuleIds(
          sorted.map((pm: { module_id: number }) => Number(pm.module_id)).filter(Number.isFinite),
        );
      } else {
        setSelectedModuleIds([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load the plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
    void fetchModules();
  }, []);

  useEffect(() => {
    if (isEditMode && id) void fetchPlan(id);
  }, [id, isEditMode]);

  const ensureCategoryId = async (name: string): Promise<number | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.category_id;

    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/admin/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to create category");
    setCategories((prev) => [...prev, data]);
    return Number(data.category_id) || null;
  };

  const searchTrim = sessionSearch.trim().toLowerCase();
  const searchFirstLetter = searchTrim.charAt(0);

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (!searchFirstLetter) return true;
      const t = (m.title ?? "").toLowerCase();
      const cat = sessionCategoryLabel(m).toLowerCase();
      return t.startsWith(searchFirstLetter) || cat.startsWith(searchFirstLetter);
    });
  }, [modules, searchFirstLetter]);

  const modulesByCategory = useMemo(() => {
    const map: Record<string, PlanModule[]> = {};
    for (const m of filteredModules) {
      const cat = sessionCategoryLabel(m);
      if (!map[cat]) map[cat] = [];
      map[cat].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return map;
  }, [filteredModules]);

  const sortedCategoryKeys = useMemo(() => {
    return Object.keys(modulesByCategory).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [modulesByCategory]);

  const totalExerciseCount = useMemo(() => {
    return modules.reduce((n, m) => n + (m.module_exercise?.length ?? 0), 0);
  }, [modules]);

  const selectedSet = useMemo(() => new Set(selectedModuleIds), [selectedModuleIds]);

  const toggleModule = (moduleId: number) => {
    setSelectedModuleIds((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((x) => x !== moduleId);
      }
      return [...prev, moduleId];
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const descriptionForApi = description.trim() || title.trim();

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await authHeaders();
      const categoryId = await ensureCategoryId(categoryName);
      const payload = {
        title: title.trim(),
        description: descriptionForApi,
        categoryId,
        moduleIds: selectedModuleIds,
      };
      const url = isEditMode ? `${API_BASE}/api/admin/plans/${id}` : `${API_BASE}/api/admin/plans`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      setSuccess(`Plan ${isEditMode ? "updated" : "saved"} successfully.`);
      navigate(`/plan-dashboard`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (isEditMode) {
      setSaveConfirmOpen(true);
      return;
    }
    void handleSave();
  };

  const handleDelete = async () => {
    if (!isEditMode || !id) return;
    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/plans/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete plan");
      navigate("/plan-dashboard", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete plan");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const pageBusy = isEditMode && loadingPlan;

  return (
    <AppLayout>
      <div className="create-session-page create-session-page--v2 create-plan-page--unified">
        <header className="create-session-header create-session-header--v2 create-plan-page-header">
          <div className="create-session-header-left">
            <h1 className="create-session-title">
              {isEditMode ? "Edit Plan" : "Create New Plan"}
            </h1>
          </div>
          <div className="create-session-header-right">
            {isEditMode ? (
              !deleteConfirm ? (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={isSaving || deleting}
                >
                  Delete
                </button>
              ) : null
            ) : null}
            <button
              type="button"
              className="back-btn back-btn--v2 create-plan-back-btn"
              onClick={() => navigate("/plan-dashboard")}
              disabled={isSaving || deleting}
            >
              Back
            </button>
            <button
              type="button"
              className="save-btn create-plan-save-btn"
              onClick={handleSaveClick}
              disabled={isSaving || pageBusy || !title.trim()}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>

        {error && <div className="create-session-error">{error}</div>}
        {success && <div className="create-session-message">{success}</div>}

        {pageBusy ? (
          <p>Loading plan…</p>
        ) : (
          <div className="create-session-unified">
            <div className="create-session-panel-hero create-plan-panel-hero">
              <StackedCardIllustration
                variant="plan"
                selectedCount={selectedModuleIds.length}
              />
              <div className="create-session-meta-fields create-session-meta-fields--stacked create-plan-hero-fields">
                <div className="input-group">
                  <label htmlFor="plan-title-v2">Title of Plan</label>
                  <input
                    id="plan-title-v2"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="plan-category-v2">Category</label>
                  <input
                    id="plan-category-v2"
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category"
                  />
                </div>
              </div>
            </div>

            <div className="create-session-panel-body">
              <div className="create-session-exercises-toolbar">
                <div className="create-session-exercises-heading">
                  <h2 className="create-session-select-title">Select Sessions</h2>
                  <span className="create-session-exercises-total">
                    {totalExerciseCount}{" "}
                    {totalExerciseCount === 1 ? "Exercise" : "Exercises"}
                  </span>
                </div>
                <div className="plan-search-wrapper plan-search-wrapper--toolbar">
                  <span className="plan-search-icon" aria-hidden>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
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
                    className="plan-search-bar"
                    placeholder="Search"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    aria-label="Search sessions"
                  />
                </div>
              </div>

              <hr className="create-session-exercises-divider" />

              {loadingModules ? (
                <p>Loading sessions…</p>
              ) : modules.length === 0 ? (
                <p className="create-session-muted">No sessions available.</p>
              ) : (
                sortedCategoryKeys.map((category) => {
                  const items = modulesByCategory[category] ?? [];
                  return (
                    <div className="create-session-category-block" key={category}>
                      <h3 className="create-session-category-heading">
                        {category}{" "}
                        <span className="create-session-category-count">
                          {items.length} Sessions
                        </span>
                      </h3>
                      <div className="create-session-exercise-grid">
                        {items.map((m) => {
                          const selected = selectedSet.has(m.module_id);
                          return (
                            <button
                              key={m.module_id}
                              type="button"
                              className={`create-session-exercise-card${selected ? " is-selected" : ""}`}
                              aria-pressed={selected}
                              onClick={() => toggleModule(m.module_id)}
                            >
                              <img
                                src={moduleThumbnail(m)}
                                alt=""
                                className="create-session-exercise-card-img"
                              />
                              <div className="create-session-exercise-card-body">
                                <h4 className="create-session-exercise-card-title">{m.title}</h4>
                                <p className="create-session-exercise-card-cat">
                                  {sessionCategoryLabel(m)}
                                </p>
                                <span className="create-session-exercise-card-tag">
                                  <AssignmentPulseIcon className="create-session-pulse-icon" />
                                  {activeUsersLabel(m.assigned_user_count)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Remove Plan"
        message="Are you sure you want to delete this plan?"
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={saveConfirmOpen}
        title="Save changes to this plan?"
        message="Your changes will update the plan in the library."
        confirmLabel="Save"
        variant="primary"
        busy={isSaving}
        onCancel={() => setSaveConfirmOpen(false)}
        onConfirm={() => {
          setSaveConfirmOpen(false);
          void handleSave();
        }}
      />
    </AppLayout>
  );
}
