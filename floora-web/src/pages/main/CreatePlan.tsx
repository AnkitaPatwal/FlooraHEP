import AppLayout from "../../components/layouts/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "./CreateSession.css";

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
  description?: string;
  category?: string;
  session_number: number;
  module_exercise?: ModuleExercise[];
  assigned_user_count?: number;
};

function moduleCategoryLabel(m: Module): string {
  const c = m.category?.trim() || m.description?.trim();
  return c || "Uncategorized";
}

function anyWordStartsWith(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return words.some((w) => w.startsWith(q));
}

function firstExerciseThumb(m: Module): string | undefined {
  const rows = [...(m.module_exercise ?? [])].sort((a, b) => a.order_index - b.order_index);
  const u = rows[0]?.exercise?.thumbnail_url?.trim();
  return u || undefined;
}

type PlanCategoryRow = { category_id: number; name: string };

/** Match existing plan_category by name (case-insensitive) or create it. Empty → null. */
async function resolvePlanCategoryId(
  rawName: string,
  headers: HeadersInit
): Promise<number | null> {
  const name = rawName.trim();
  if (!name) return null;

  const listRes = await fetch(`${API_BASE}/api/admin/categories`, { headers });
  if (!listRes.ok) throw new Error("Failed to load categories");
  const list = (await listRes.json()) as PlanCategoryRow[];
  if (!Array.isArray(list)) throw new Error("Failed to load categories");

  const lower = name.toLowerCase();
  const existing = list.find((c) => c.name.trim().toLowerCase() === lower);
  if (existing) return existing.category_id;

  const postRes = await fetch(`${API_BASE}/api/admin/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
  const data = (await postRes.json()) as { category_id?: number; error?: string };
  if (postRes.ok && data.category_id != null) return data.category_id;

  if (postRes.status === 409) {
    const againRes = await fetch(`${API_BASE}/api/admin/categories`, { headers });
    const again = (await againRes.json()) as PlanCategoryRow[];
    if (Array.isArray(again)) {
      const found = again.find((c) => c.name.trim().toLowerCase() === lower);
      if (found) return found.category_id;
    }
  }

  throw new Error(data.error || "Failed to save category");
}

export default function CreatePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [persistedDescription, setPersistedDescription] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const [allModules, setAllModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);

  const [sessionSearch, setSessionSearch] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [removeModuleId, setRemoveModuleId] = useState<number | null>(null);
  const [planDataLoaded, setPlanDataLoaded] = useState(false);
  const [deletePlanConfirm, setDeletePlanConfirm] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);

  useEffect(() => {
    void loadModules();
  }, []);

  useEffect(() => {
    if (!isEditMode) setPlanDataLoaded(false);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode || !id) return;
    void fetchPlan(id);
  }, [id, isEditMode]);

  const loadModules = async () => {
    setLoadingModules(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setAllModules(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      setAllModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchPlan = async (planId: string) => {
    setPlanLoading(true);
    setPlanDataLoaded(false);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/plans/${planId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setTitle(data.title || "");
      setPersistedDescription(typeof data.description === "string" ? data.description : "");
      const pcRaw = data.plan_category as { name?: string } | { name?: string }[] | null | undefined;
      const pc = Array.isArray(pcRaw) ? pcRaw[0] : pcRaw;
      setCategoryName(pc?.name?.trim() ? pc.name : "");

      const rows = [...(data.plan_module ?? [])].sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
      );
      setSelectedModuleIds(rows.map((pm: { module_id: number }) => pm.module_id));
      setPlanDataLoaded(true);
    } catch (e) {
      setPlanDataLoaded(false);
      setError(e instanceof Error ? e.message : "Could not load the plan.");
      setSelectedModuleIds([]);
    } finally {
      setPlanLoading(false);
    }
  };

  const selectedIdsSet = useMemo(() => new Set(selectedModuleIds), [selectedModuleIds]);

  const searchLower = sessionSearch.trim().toLowerCase();
  const modulesMatchingSearch = useMemo(() => {
    return allModules.filter((m) => {
      if (!searchLower) return true;
      const t = m.title ?? "";
      const cat = moduleCategoryLabel(m);
      return anyWordStartsWith(t, searchLower) || anyWordStartsWith(cat, searchLower);
    });
  }, [allModules, searchLower]);

  const groupedSessions = useMemo(() => {
    const map = new Map<string, Module[]>();
    for (const m of modulesMatchingSearch) {
      const g = moduleCategoryLabel(m);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [modulesMatchingSearch]);

  const addModule = (moduleId: number) => {
    setSelectedModuleIds((prev) => (prev.includes(moduleId) ? prev : [...prev, moduleId]));
  };

  const removeModule = (moduleId: number) => {
    setSelectedModuleIds((prev) => prev.filter((x) => x !== moduleId));
    setRemoveModuleId(null);
  };

  const handleCardClick = (moduleId: number) => {
    if (selectedIdsSet.has(moduleId)) setRemoveModuleId(moduleId);
    else addModule(moduleId);
  };

  const handleDeletePlan = async () => {
    if (!id || !deletePlanConfirm) return;
    setDeletingPlan(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/plans/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete plan");
      setDeletePlanConfirm(false);
      navigate("/plan-dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete plan");
    } finally {
      setDeletingPlan(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setIsSaving(true);
    try {
      const headers = await authHeaders();
      const categoryId = await resolvePlanCategoryId(categoryName, headers);
      const payload = {
        title: title.trim(),
        description: isEditMode ? persistedDescription : "",
        categoryId,
        moduleIds: selectedModuleIds,
      };

      const url = isEditMode
        ? `${API_BASE}/api/admin/plans/${id}`
        : `${API_BASE}/api/admin/plans`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      navigate("/plan-dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const editLoading = isEditMode && planLoading && !error;
  const showMainContent = !isEditMode || !planLoading || error !== "";
  const canSave = Boolean(title.trim()) && !(isEditMode && planLoading);

  return (
    <AppLayout>
      <div className="create-session-page">
        <header className="create-session-header">
          <div>
            <h1 className="create-session-title">
              {isEditMode ? "Edit Plan" : "Create New Plan"}
            </h1>
          </div>
          <div className="create-session-header-actions">
            <button
              type="button"
              className="create-session-back-btn"
              onClick={() => navigate("/plan-dashboard")}
            >
              Back
            </button>
            {isEditMode && planDataLoaded ? (
              <button
                type="button"
                className="create-session-delete-btn"
                onClick={() => setDeletePlanConfirm(true)}
                disabled={isSaving || deletingPlan}
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              className="create-session-save-btn"
              onClick={() => void handleSave()}
              disabled={isSaving || deletingPlan || !canSave}
            >
              {isSaving ? "Saving…" : isEditMode ? "Save changes" : "Save"}
            </button>
          </div>
        </header>

        {error && <div className="create-session-error">{error}</div>}

        {editLoading && <p className="create-session-loading">Loading plan…</p>}

        {showMainContent && !editLoading && (
          <>
            <div className="create-session-meta">
              <div
                className="create-session-count-stack"
                role="img"
                aria-label={`${selectedModuleIds.length} session${selectedModuleIds.length === 1 ? "" : "s"} in this plan`}
              >
                <div className="create-session-count-card" aria-hidden />
                <div className="create-session-count-card" aria-hidden />
                <div className="create-session-count-card create-session-count-card--front">
                  <span className="create-session-count-number">{selectedModuleIds.length}</span>
                </div>
              </div>
              <div className="create-session-fields">
                <div className="create-session-field">
                  <label htmlFor="plan-title">Title of Plan</label>
                  <input
                    id="plan-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                  />
                </div>
                <div className="create-session-field">
                  <label htmlFor="plan-category">Category</label>
                  <input
                    id="plan-category"
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category"
                  />
                </div>
              </div>
            </div>

            <section>
              <div className="create-session-picker-head">
                <h2 className="create-session-picker-title">
                  Select Sessions
                  <span className="create-session-picker-count">
                    {allModules.length} Sessions
                  </span>
                </h2>
                <div className="create-session-search-wide">
                  <span className="create-session-search-icon" aria-hidden>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      width="18"
                      height="18"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                      />
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Search"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    aria-label="Search sessions"
                  />
                </div>
              </div>

              {loadingModules ? (
                <p className="create-session-loading">Loading sessions…</p>
              ) : allModules.length === 0 ? (
                <p className="create-session-empty-grid">No sessions available.</p>
              ) : groupedSessions.length === 0 ? (
                <p className="create-session-empty-grid">No sessions match your search.</p>
              ) : (
                <>
                  {groupedSessions.map(([groupName, items]) => (
                    <div key={groupName} className="create-session-group">
                      <h3 className="create-session-group-title">
                        {groupName}
                        <span className="create-session-group-count">
                          {" "}
                          {items.length} Sessions
                        </span>
                      </h3>
                      <div className="create-session-grid">
                        {items.map((m) => {
                          const selected = selectedIdsSet.has(m.module_id);
                          const thumb = firstExerciseThumb(m);
                          const activeUsers = m.assigned_user_count ?? 0;
                          const catLine = moduleCategoryLabel(m);
                          return (
                            <button
                              key={m.module_id}
                              type="button"
                              className={
                                selected
                                  ? "create-session-ex-card create-session-ex-card--selected"
                                  : "create-session-ex-card"
                              }
                              onClick={() => handleCardClick(m.module_id)}
                            >
                              <div
                                className="create-session-ex-thumb"
                                style={
                                  thumb ? { backgroundImage: `url(${thumb})` } : undefined
                                }
                              />
                              <div className="create-session-ex-body">
                                <p className="create-session-ex-title">{m.title}</p>
                                <p className="create-session-ex-cat">{catLine}</p>
                                <span className="create-session-ex-badge">
                                  <svg
                                    className="create-session-ex-badge-icon"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                  </svg>
                                  {activeUsers}{" "}
                                  {activeUsers === 1 ? "Active User" : "Active Users"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>
          </>
        )}

        {deletePlanConfirm && planDataLoaded && (
          <div
            className="create-session-confirm-overlay"
            onClick={() => !deletingPlan && setDeletePlanConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-plan-title"
          >
            <div
              className="create-session-confirm-dialog"
              onClick={(ev) => ev.stopPropagation()}
            >
              <h3 id="confirm-delete-plan-title" className="create-session-confirm-title">
                Delete plan
              </h3>
              <p className="create-session-confirm-message">
                Delete &quot;{title.trim() || "this plan"}&quot;? This cannot be undone.
              </p>
              <div className="create-session-confirm-actions">
                <button
                  type="button"
                  className="create-session-confirm-cancel"
                  disabled={deletingPlan}
                  onClick={() => setDeletePlanConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-session-confirm-remove"
                  disabled={deletingPlan}
                  onClick={() => void handleDeletePlan()}
                >
                  {deletingPlan ? "Deleting…" : "Delete plan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {removeModuleId != null && (() => {
          const mod = allModules.find((m) => m.module_id === removeModuleId);
          const name = mod?.title ?? `Session #${removeModuleId}`;
          return (
            <div
              className="create-session-confirm-overlay"
              onClick={() => setRemoveModuleId(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-remove-plan-session-title"
            >
              <div
                className="create-session-confirm-dialog"
                onClick={(ev) => ev.stopPropagation()}
              >
                <h3
                  id="confirm-remove-plan-session-title"
                  className="create-session-confirm-title"
                >
                  Remove session
                </h3>
                <p className="create-session-confirm-message">
                  Remove &quot;{name}&quot; from this plan?
                </p>
                <div className="create-session-confirm-actions">
                  <button
                    type="button"
                    className="create-session-confirm-cancel"
                    onClick={() => setRemoveModuleId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="create-session-confirm-remove"
                    onClick={() => removeModule(removeModuleId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </AppLayout>
  );
}
