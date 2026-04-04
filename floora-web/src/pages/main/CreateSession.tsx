import AppLayout from "../../components/layouts/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "./CreateSession.css";

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
  body_part?: string | null;
  thumbnail_url?: string | null;
  assigned_user_count?: number;
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
};

/** True if `query` matches the start of any whitespace-separated word in `text`. */
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

function dedupeExerciseIds(ids: number[], exerciseList: Exercise[]): number[] {
  const seenTitles = new Set<string>();
  return ids.filter((id) => {
    const title = exerciseList.find((e) => e.exercise_id === id)?.title?.trim().toLowerCase();
    if (!title || seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  });
}

export default function CreateSession() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [modules, setModules] = useState<Module[]>([]);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [exerciseListError, setExerciseListError] = useState("");
  const [savingMapping, setSavingMapping] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const saveSessionMeta = async (moduleId: number) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: newTitle.trim(),
        category: newCategory.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to update session");
    return data as Module;
  };

  const loadModules = async (): Promise<Module[]> => {
    setLoadingModules(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      setModules([]);
      return [];
    } finally {
      setLoadingModules(false);
    }
  };

  const loadExercises = async () => {
    setLoadingExercises(true);
    setExerciseListError("");
    try {
      const headers = await authHeaders();
      const pageSize = 100;
      let page = 1;
      const all: Exercise[] = [];
      let totalPages = 1;
      do {
        const res = await fetch(
          `${API_BASE}/api/exercises?page=${page}&pageSize=${pageSize}`,
          { method: "GET", headers },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load exercises");
        const chunk = data?.data ?? [];
        if (Array.isArray(chunk)) all.push(...chunk);
        const meta = data?.meta as { totalPages?: number } | undefined;
        totalPages = Math.max(1, meta?.totalPages ?? 1);
        page += 1;
      } while (page <= totalPages);
      setExercises(all);
    } catch (e) {
      setExercises([]);
      setExerciseListError(e instanceof Error ? e.message : "Failed to load exercises");
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    void loadModules();
    void loadExercises();
  }, []);

  useEffect(() => {
    if (!isEditMode || !id || modules.length === 0) return;
    const moduleId = Number(id);
    const mod = modules.find((m) => m.module_id === moduleId);
    if (mod) {
      setEditingModule(mod);
      setNewTitle(mod.title);
      setNewCategory(mod.category ?? mod.description ?? "");
      const withOrder = (mod.module_exercise || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((me) => ({ id: me.exercise.exercise_id, title: me.exercise.title?.trim().toLowerCase() }));
      const seenTitles = new Set<string>();
      const ids = withOrder
        .filter(({ title }) => {
          if (!title || seenTitles.has(title)) return false;
          seenTitles.add(title);
          return true;
        })
        .map(({ id: exId }) => exId);
      setSelectedExerciseIds(ids);
    } else {
      setError("Session not found.");
    }
  }, [isEditMode, id, modules]);

  const selectedIdsSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);

  const searchLower = exerciseSearch.trim().toLowerCase();
  const exercisesMatchingSearch = useMemo(() => {
    return exercises.filter((e) => {
      if (!searchLower) return true;
      const title = e.title ?? "";
      const bp = e.body_part ?? "";
      return anyWordStartsWith(title, searchLower) || anyWordStartsWith(bp, searchLower);
    });
  }, [exercises, searchLower]);

  const groupedExercises = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of exercisesMatchingSearch) {
      const g = e.body_part?.trim() || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercisesMatchingSearch]);

  const addExercise = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.exercise_id === exerciseId);
    const titleLower = exercise?.title?.trim().toLowerCase();
    setSelectedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) return prev;
      if (titleLower) {
        const hasSameTitle = prev.some(
          (pid) => exercises.find((e) => e.exercise_id === pid)?.title?.trim().toLowerCase() === titleLower
        );
        if (hasSameTitle) return prev;
      }
      return [...prev, exerciseId];
    });
  };

  const removeExercise = (exerciseId: number) => {
    setSelectedExerciseIds((prev) => prev.filter((x) => x !== exerciseId));
    setRemoveConfirmId(null);
  };

  const openRemoveConfirm = (exerciseId: number) => {
    setRemoveConfirmId(exerciseId);
  };

  const handleCardClick = (exerciseId: number) => {
    if (selectedIdsSet.has(exerciseId)) openRemoveConfirm(exerciseId);
    else addExercise(exerciseId);
  };

  const handleDeleteSession = async () => {
    const moduleId = editingModule?.module_id;
    if (moduleId == null) return;
    setDeletingSession(true);
    setMessage("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete session");
      setDeleteSessionConfirm(false);
      navigate("/sessions");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to delete session");
    } finally {
      setDeletingSession(false);
    }
  };

  const handleHeaderSave = async () => {
    setMessage("");
    if (!newTitle.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSavingMapping(true);
    try {
      let moduleId = editingModule?.module_id;
      if (moduleId == null) {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/admin/modules`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: newTitle.trim(),
            category: newCategory.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create session");
        const created = data as Module;
        moduleId = created.module_id;
        setEditingModule({ ...created, module_exercise: [] });
      }

      await saveSessionMeta(moduleId);

      const idsToSave = dedupeExerciseIds(selectedExerciseIds, exercises);
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}/exercises`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ exercise_ids: idsToSave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save exercises");

      const list = await loadModules();
      const updated = list.find((m) => m.module_id === moduleId);
      if (updated) setEditingModule(updated);
      setSelectedExerciseIds(idsToSave);
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingMapping(false);
    }
  };

  const showMainContent = !isEditMode || editingModule != null;
  const editLoading = isEditMode && !editingModule && !error && loadingModules;
  const canSave = newTitle.trim() && !(isEditMode && !editingModule);

  return (
    <AppLayout>
      <div className="create-session-page">
          <header className="create-session-header">
            <div>
              <h1 className="create-session-title">
                {isEditMode ? "Edit Session" : "Create New Session"}
              </h1>
            </div>
            <div className="create-session-header-actions">
              <button
                type="button"
                className="create-session-back-btn"
                onClick={() => navigate("/sessions")}
              >
                Back
              </button>
              {isEditMode && editingModule != null ? (
                <button
                  type="button"
                  className="create-session-delete-btn"
                  onClick={() => setDeleteSessionConfirm(true)}
                  disabled={savingMapping || deletingSession}
                >
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                className="create-session-save-btn"
                onClick={() => void handleHeaderSave()}
                disabled={savingMapping || deletingSession || !canSave}
              >
                {savingMapping ? "Saving…" : isEditMode ? "Save changes" : "Save"}
              </button>
            </div>
          </header>

          {error && <div className="create-session-error">{error}</div>}
          {message && <div className="create-session-message">{message}</div>}

          {editLoading && (
            <p className="create-session-loading">Loading session…</p>
          )}

          {showMainContent && !editLoading && (
            <>
              <div className="create-session-meta">
                <div
                  className="create-session-count-stack"
                  role="img"
                  aria-label={`${selectedExerciseIds.length} exercise${selectedExerciseIds.length === 1 ? "" : "s"} in this session`}
                >
                  <div className="create-session-count-card" aria-hidden />
                  <div className="create-session-count-card" aria-hidden />
                  <div className="create-session-count-card create-session-count-card--front">
                    <span className="create-session-count-number">{selectedExerciseIds.length}</span>
                  </div>
                </div>
                <div className="create-session-fields">
                  <div className="create-session-field">
                    <label htmlFor="session-title">Title of Session</label>
                    <input
                      id="session-title"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Title"
                    />
                  </div>
                  <div className="create-session-field">
                    <label htmlFor="session-category">Category</label>
                    <input
                      id="session-category"
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Category"
                    />
                  </div>
                </div>
              </div>

              <section>
                <div className="create-session-picker-head">
                  <h2 className="create-session-picker-title">
                    Select Exercises
                    <span className="create-session-picker-count">{exercises.length} Exercises</span>
                  </h2>
                  <div className="create-session-search-wide">
                    <span className="create-session-search-icon" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                      </svg>
                    </span>
                    <input
                      type="search"
                      placeholder="Search"
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      aria-label="Search exercises"
                    />
                  </div>
                </div>

                {exerciseListError ? (
                  <div className="create-session-error" role="alert">
                    {exerciseListError}
                  </div>
                ) : null}

                {loadingExercises ? (
                  <p className="create-session-loading">Loading exercises…</p>
                ) : exercises.length === 0 ? (
                  <p className="create-session-empty-grid">No exercises available.</p>
                ) : groupedExercises.length === 0 ? (
                  <p className="create-session-empty-grid">No exercises match your search.</p>
                ) : (
                  <>
                    {groupedExercises.map(([groupName, items]) => (
                      <div key={groupName} className="create-session-group">
                        <h3 className="create-session-group-title">
                          {groupName}
                          <span className="create-session-group-count"> {items.length} Exercises</span>
                        </h3>
                        <div className="create-session-grid">
                          {items.map((e) => {
                            const selected = selectedIdsSet.has(e.exercise_id);
                            const thumb = e.thumbnail_url?.trim();
                            const activeUsers = e.assigned_user_count ?? 0;
                            const categoryLabel =
                              e.body_part?.trim() || e.description?.trim() || "—";
                            return (
                              <button
                                key={e.exercise_id}
                                type="button"
                                className={
                                  selected
                                    ? "create-session-ex-card create-session-ex-card--selected"
                                    : "create-session-ex-card"
                                }
                                onClick={() => handleCardClick(e.exercise_id)}
                              >
                                <div
                                  className="create-session-ex-thumb"
                                  style={
                                    thumb
                                      ? { backgroundImage: `url(${thumb})` }
                                      : undefined
                                  }
                                />
                                <div className="create-session-ex-body">
                                  <p className="create-session-ex-title">{e.title}</p>
                                  <p className="create-session-ex-cat">{categoryLabel}</p>
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

        {deleteSessionConfirm && editingModule != null && (
          <div
            className="create-session-confirm-overlay"
            onClick={() => !deletingSession && setDeleteSessionConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-session-title"
          >
            <div
              className="create-session-confirm-dialog"
              onClick={(ev) => ev.stopPropagation()}
            >
              <h3 id="confirm-delete-session-title" className="create-session-confirm-title">
                Delete session
              </h3>
              <p className="create-session-confirm-message">
                Delete &quot;{editingModule.title}&quot;? This cannot be undone.
              </p>
              <div className="create-session-confirm-actions">
                <button
                  type="button"
                  className="create-session-confirm-cancel"
                  disabled={deletingSession}
                  onClick={() => setDeleteSessionConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-session-confirm-remove"
                  disabled={deletingSession}
                  onClick={() => void handleDeleteSession()}
                >
                  {deletingSession ? "Deleting…" : "Delete session"}
                </button>
              </div>
            </div>
          </div>
        )}

        {removeConfirmId != null && (() => {
          const ex = exercises.find((e) => e.exercise_id === removeConfirmId);
          const name = ex?.title ?? `Exercise #${removeConfirmId}`;
          return (
            <div
              className="create-session-confirm-overlay"
              onClick={() => setRemoveConfirmId(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-remove-title"
            >
              <div
                className="create-session-confirm-dialog"
                onClick={(ev) => ev.stopPropagation()}
              >
                <h3 id="confirm-remove-title" className="create-session-confirm-title">
                  Remove exercise
                </h3>
                <p className="create-session-confirm-message">
                  Remove &quot;{name}&quot; from this session?
                </p>
                <div className="create-session-confirm-actions">
                  <button
                    type="button"
                    className="create-session-confirm-cancel"
                    onClick={() => setRemoveConfirmId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="create-session-confirm-remove"
                    onClick={() => removeExercise(removeConfirmId)}
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
