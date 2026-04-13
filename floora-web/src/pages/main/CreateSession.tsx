import AppLayout from "../../components/layouts/AppLayout";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import sessionImg from "../../assets/exercise.jpg";
import "./CreateSession.css";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

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
  body_part?: string | null;
  thumbnail_url?: string | null;
  assigned_user_count?: number | null;
};

type ModuleExercise = {
  module_exercise_id: number;
  order_index: number;
  exercise: {
    exercise_id: number;
    title: string;
    description?: string;
  };
};

type Module = {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  module_exercise: ModuleExercise[];
};

function exerciseCategory(e: Exercise): string {
  const p = e.body_part?.trim();
  return p || "Uncategorized";
}

function activeUsersLabel(count: number | null | undefined): string {
  if (count === null || count === undefined) return "—";
  return count === 1 ? "1 Active User" : `${count} Active Users`;
}

const EXERCISES_PAGE_SIZE = 100;
const EXERCISES_MAX_PAGES = 200;

/** Stacked cards; center number = count of exercises currently selected. */
function SessionStackIllustration({ selectedCount }: { selectedCount: number }) {
  const label =
    selectedCount === 0
      ? "No exercises selected"
      : selectedCount === 1
        ? "1 exercise selected"
        : `${selectedCount} exercises selected`;
  const digits = String(selectedCount);
  const fontSize = digits.length > 2 ? 28 : digits.length > 1 ? 36 : 44;

  return (
    <div
      className="create-session-stack-visual"
      aria-live="polite"
      aria-label={label}
    >
      <svg
        className="create-session-stack-svg"
        viewBox="0 0 200 168"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="28"
          y="36"
          width="132"
          height="100"
          rx="12"
          fill="#fff"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        <rect
          x="20"
          y="24"
          width="132"
          height="100"
          rx="12"
          fill="#fff"
          stroke="#d1d5db"
          strokeWidth="2"
        />
        <rect
          x="12"
          y="12"
          width="132"
          height="100"
          rx="12"
          fill="#fff"
          stroke="#5a8e93"
          strokeWidth="2"
        />
        <text
          x="78"
          y="64"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#5a8e93"
          fontSize={fontSize}
          fontWeight="700"
          fontFamily="system-ui, Segoe UI, sans-serif"
        >
          {digits}
        </text>
      </svg>
    </div>
  );
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
  const [saving, setSaving] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const nextSessionNumber = useMemo(() => {
    if (modules.length === 0) return 1;
    return Math.max(...modules.map((m) => m.session_number)) + 1;
  }, [modules]);

  const saveSessionMeta = async (moduleId: number) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newCategory.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to update session");
    return data as Module;
  };

  const loadModules = async () => {
    setLoadingModules(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");
      setModules(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const loadExercises = async () => {
    setLoadingExercises(true);
    try {
      const headers = await authHeaders();
      const merged: Exercise[] = [];
      for (let page = 1; page <= EXERCISES_MAX_PAGES; page += 1) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(EXERCISES_PAGE_SIZE),
        });
        const res = await fetch(`${API_BASE}/api/exercises?${params}`, {
          method: "GET",
          headers,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load exercises");
        const list = data?.data ?? [];
        const batch: Exercise[] = (Array.isArray(list) ? list : []).map((row: Exercise) => ({
          ...row,
          exercise_id: Number(row.exercise_id),
        }));
        merged.push(...batch);
        if (batch.length < EXERCISES_PAGE_SIZE) break;
      }
      const byId = new Map<number, Exercise>();
      for (const e of merged) {
        if (Number.isFinite(e.exercise_id)) byId.set(e.exercise_id, e);
      }
      setExercises(Array.from(byId.values()));
    } catch {
      setExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    loadModules();
    loadExercises();
  }, []);

  useEffect(() => {
    if (!isEditMode || !id || modules.length === 0) return;
    const moduleId = Number(id);
    const mod = modules.find((m) => m.module_id === moduleId);
    if (mod) {
      setEditingModule(mod);
      setNewTitle(mod.title);
      setNewCategory(mod.description ?? "");
      const withOrder = (mod.module_exercise || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((me) => ({
          id: me.exercise.exercise_id,
          title: me.exercise.title?.trim().toLowerCase(),
        }));
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

  const searchTrim = exerciseSearch.trim().toLowerCase();
  const searchFirstLetter = searchTrim.charAt(0);
  const filteredExercises = useMemo(() => {
    return exercises.filter((e) => {
      if (!searchFirstLetter) return true;
      const title = (e.title ?? "").toLowerCase();
      const bp = (e.body_part ?? "").toLowerCase();
      const desc = (e.description ?? "").toLowerCase();
      return (
        title.startsWith(searchFirstLetter) ||
        bp.startsWith(searchFirstLetter) ||
        desc.startsWith(searchFirstLetter)
      );
    });
  }, [exercises, searchFirstLetter]);

  const exercisesByCategory = useMemo(() => {
    const map: Record<string, Exercise[]> = {};
    for (const e of filteredExercises) {
      const cat = exerciseCategory(e);
      if (!map[cat]) map[cat] = [];
      map[cat].push(e);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return map;
  }, [filteredExercises]);

  const sortedCategoryKeys = useMemo(() => {
    return Object.keys(exercisesByCategory).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [exercisesByCategory]);

  const selectedSet = new Set(selectedExerciseIds);

  const toggleExercise = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.exercise_id === exerciseId);
    const titleLower = exercise?.title?.trim().toLowerCase();

    setSelectedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((x) => x !== exerciseId);
      }
      if (titleLower) {
        const hasSameTitle = prev.some(
          (id) =>
            exercises.find((e) => e.exercise_id === id)?.title?.trim().toLowerCase() ===
            titleLower
        );
        if (hasSameTitle) return prev;
      }
      return [...prev, exerciseId];
    });
  };

  const handleSave = async () => {
    setMessage("");
    if (!newTitle.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeaders();
      let moduleId = editingModule?.module_id;

      if (moduleId == null) {
        const res = await fetch(`${API_BASE}/api/admin/modules`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: newTitle.trim(),
            description: newCategory.trim(),
            session_number: nextSessionNumber,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create session");
        const created = data as Module;
        setEditingModule(created);
        moduleId = created.module_id;
        await loadModules();
      } else {
        const updated = await saveSessionMeta(moduleId);
        setEditingModule(updated);
        await loadModules();
      }

      const seenTitles = new Set<string>();
      const idsToSave = selectedExerciseIds.filter((exId) => {
        const title = exercises.find((e) => e.exercise_id === exId)?.title?.trim().toLowerCase();
        if (!title || seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
      });

      const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}/exercises`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ exercise_ids: idsToSave }),
      });
      const putData = await res.json();
      if (!res.ok) throw new Error(putData.error || "Failed to save exercises");

      setSelectedExerciseIds(idsToSave);
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
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
    if (!isEditMode || !editingModule?.module_id) return;
    setMessage("");
    setDeleting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules/${editingModule.module_id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete session");
      navigate("/sessions", { replace: true });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const showExerciseGrid = !isEditMode || editingModule != null;
  const pageBusy = (isEditMode && !editingModule && !error && loadingModules) || false;

  return (
    <AppLayout>
      <div className="create-session-page create-session-page--v2">
        <header className="create-session-header create-session-header--v2">
          <div className="create-session-header-left">
            <h1 className="create-session-title">
              {isEditMode ? "Edit Session" : "Create New Session"}
            </h1>
          </div>
          <div className="create-session-header-right">
            <button
              type="button"
              className="back-btn back-btn--v2"
              onClick={() => navigate("/sessions")}
            >
              Back
            </button>
            {isEditMode && editingModule?.module_id ? (
              !deleteConfirmOpen ? (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={saving || deleting}
                >
                  Delete
                </button>
              ) : null
            ) : null}
            <button
              type="button"
              className="save-btn"
              onClick={handleSaveClick}
              disabled={saving || !newTitle.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>

        {error && <div className="create-session-error">{error}</div>}
        {message && <div className="create-session-message">{message}</div>}

        {pageBusy ? (
          <p>Loading session…</p>
        ) : (
          <div className="create-session-unified">
            <div className="create-session-panel-hero">
              <SessionStackIllustration selectedCount={selectedExerciseIds.length} />
              <div className="create-session-meta-fields create-session-meta-fields--stacked">
                <div className="input-group">
                  <label htmlFor="session-title-v2">Title of Session</label>
                  <input
                    id="session-title-v2"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="session-category-v2">Category</label>
                  <input
                    id="session-category-v2"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Category"
                  />
                </div>
              </div>
            </div>

            {showExerciseGrid && (
              <>
                <div className="create-session-panel-body">
                <div className="create-session-exercises-toolbar">
                  <div className="create-session-exercises-heading">
                    <h2 className="create-session-select-title">Select Exercises</h2>
                    <span className="create-session-exercises-total">
                      {exercises.length} Exercises
                    </span>
                  </div>
                  <div className="create-session-search-wrapper create-session-search-wrapper--toolbar">
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
                      type="text"
                      className="create-session-search-input"
                      placeholder="Search"
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      aria-label="Search exercises"
                    />
                  </div>
                </div>

                <hr className="create-session-exercises-divider" />

                {loadingExercises ? (
                  <p>Loading exercises…</p>
                ) : exercises.length === 0 ? (
                  <p className="create-session-muted">No exercises available.</p>
                ) : (
                  sortedCategoryKeys.map((category) => {
                    const items = exercisesByCategory[category] ?? [];
                    return (
                      <div className="create-session-category-block" key={category}>
                        <h3 className="create-session-category-heading">
                          {category}{" "}
                          <span className="create-session-category-count">
                            {items.length} Exercises
                          </span>
                        </h3>
                        <div className="create-session-exercise-grid">
                          {items.map((e) => {
                            const selected = selectedSet.has(e.exercise_id);
                            return (
                              <button
                                key={e.exercise_id}
                                type="button"
                                className={`create-session-exercise-card${selected ? " is-selected" : ""}`}
                                onClick={() => toggleExercise(e.exercise_id)}
                              >
                                <img
                                  src={e.thumbnail_url?.trim() || sessionImg}
                                  alt=""
                                  className="create-session-exercise-card-img"
                                />
                                <div className="create-session-exercise-card-body">
                                  <h4 className="create-session-exercise-card-title">
                                    {e.title}
                                  </h4>
                                  <p className="create-session-exercise-card-cat">
                                    {exerciseCategory(e)}
                                  </p>
                                  <span className="create-session-exercise-card-tag">
                                    <AssignmentPulseIcon className="create-session-pulse-icon" />
                                    {activeUsersLabel(e.assigned_user_count)}
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
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Are you sure you want to delete this session?"
        message="This will permanently remove the session from the library."
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={saveConfirmOpen}
        title="Save changes to this session?"
        message="Your changes will update the session in the library."
        confirmLabel="Save"
        variant="primary"
        busy={saving}
        onCancel={() => setSaveConfirmOpen(false)}
        onConfirm={() => {
          setSaveConfirmOpen(false);
          void handleSave();
        }}
      />
    </AppLayout>
  );
}
