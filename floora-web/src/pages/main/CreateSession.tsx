import AppLayout from "../../components/layouts/AppLayout";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase-client";
import "./CreateSession.css";

const API_BASE = "http://localhost:3000";

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
  const [newDescription, setNewDescription] = useState("");
  const [newSessionNumber, setNewSessionNumber] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

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
      const res = await fetch(`${API_BASE}/api/exercises?pageSize=100`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load exercises");
      const list = data?.data ?? [];
      setExercises(Array.isArray(list) ? list : []);
    } catch (e) {
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
      setNewDescription(mod.description ?? "");
      setNewSessionNumber(mod.session_number);
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
        .map(({ id }) => id);
      setSelectedExerciseIds(ids);
    } else {
      setError("Session not found.");
    }
  }, [isEditMode, id, modules]);

  const selectedIdsSet = new Set(selectedExerciseIds);
  const selectedTitlesSet = new Set(
    selectedExerciseIds
      .map((id) => exercises.find((e) => e.exercise_id === id)?.title?.trim().toLowerCase())
      .filter(Boolean)
  );
  const searchLower = exerciseSearch.trim().toLowerCase();
  const availableExercises = exercises.filter((e) => {
    if (selectedIdsSet.has(e.exercise_id)) return false;
    if (selectedTitlesSet.has((e.title ?? "").trim().toLowerCase())) return false;
    if (searchLower) {
      const title = (e.title ?? "").toLowerCase();
      if (!title.includes(searchLower)) return false;
    }
    return true;
  });

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!newTitle.trim()) {
      setMessage("Title is required.");
      return;
    }
    setCreating(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          session_number: newSessionNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      await loadModules();
      const created = data as Module;
      setEditingModule(created);
      setSelectedExerciseIds([]);
      setMessage("Session created. Add exercises below and save.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const addExercise = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.exercise_id === exerciseId);
    const titleLower = exercise?.title?.trim().toLowerCase();
    setSelectedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) return prev;
      if (titleLower) {
        const hasSameTitle = prev.some(
          (id) => exercises.find((e) => e.exercise_id === id)?.title?.trim().toLowerCase() === titleLower
        );
        if (hasSameTitle) return prev;
      }
      return [...prev, exerciseId];
    });
  };

  const removeExercise = (exerciseId: number) => {
    setSelectedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
    setRemoveConfirmId(null);
  };

  const openRemoveConfirm = (exerciseId: number) => {
    setRemoveConfirmId(exerciseId);
  };

  const handleSaveExercises = async () => {
    const moduleId = editingModule?.module_id;
    if (moduleId == null) return;
    const seenTitles = new Set<string>();
    const idsToSave = selectedExerciseIds.filter((id) => {
      const title = exercises.find((e) => e.exercise_id === id)?.title?.trim().toLowerCase();
      if (!title || seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    });
    setSavingMapping(true);
    setMessage("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/api/admin/modules/${moduleId}/exercises`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ exercise_ids: idsToSave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save exercises");
      setMessage("Exercises saved.");
      await loadModules();
      const updated = modules.find((m) => m.module_id === moduleId);
      if (updated) setEditingModule(updated);
      setSelectedExerciseIds(idsToSave);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save exercises");
    } finally {
      setSavingMapping(false);
    }
  };

  return (
    <AppLayout>
      <div className="create-session-page">
        <header className="create-session-header">
          <div className="create-session-header-left">
            <h1 className="create-session-title">
              {isEditMode ? `Edit Session: ${editingModule?.title ?? ""}` : "Add New Session"}
            </h1>
          </div>
          <div className="create-session-header-right">
            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/sessions")}
            >
              Back
            </button>
          </div>
        </header>

        {error && <div className="create-session-error">{error}</div>}
        {message && <div className="create-session-message">{message}</div>}

        {!isEditMode && !editingModule && (
          <section className="create-session-section">
            <h2>Create session</h2>
            <form onSubmit={handleCreateSession} className="create-session-form">
              <div className="input-group">
                <label htmlFor="session-title">Title *</label>
                <input
                  id="session-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Week 1 Foundations"
                />
              </div>
              <div className="input-group">
                <label htmlFor="session-desc">Description</label>
                <textarea
                  id="session-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </div>
              <div className="input-group">
                <label htmlFor="session-num">Session number</label>
                <input
                  id="session-num"
                  type="number"
                  min={1}
                  value={newSessionNumber}
                  onChange={(e) => setNewSessionNumber(Number(e.target.value) || 1)}
                />
              </div>
              <button type="submit" className="save-btn" disabled={creating}>
                {creating ? "Creating…" : "Create session"}
              </button>
            </form>
          </section>
        )}

        {(editingModule || isEditMode) && (
          <section className="create-session-section">
            {!isEditMode && editingModule && (
              <p className="create-session-hint">
                Session &quot;{editingModule.title}&quot; created. Add exercises below. Duplicates are not allowed.
              </p>
            )}
            {isEditMode && editingModule && (
              <p className="create-session-hint">
                Add or remove exercises. Duplicates not allowed. Use search to filter exercises.
              </p>
            )}

            <div className="create-session-search-row">
              <label htmlFor="exercise-search">Search exercises</label>
              <div className="create-session-search-wrapper">
                <span className="create-session-search-icon" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.6-4.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                  </svg>
                </span>
                <input
                  id="exercise-search"
                  type="text"
                  className="create-session-search-input"
                  placeholder="Filter by exercise name..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingExercises ? (
              <p>Loading exercises…</p>
            ) : (
              <div className="create-session-two-col">
                <div className="create-session-pool">
                  <h3>Available exercises</h3>
                  <ul className="create-session-exercise-list">
                    {availableExercises.map((e) => (
                      <li key={e.exercise_id}>
                        <button
                          type="button"
                          className="create-session-add-btn"
                          onClick={() => addExercise(e.exercise_id)}
                        >
                          + {e.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {availableExercises.length === 0 && (
                    <p className="create-session-muted">
                      {exercises.length === 0
                        ? "No exercises available."
                        : selectedIdsSet.size === 0
                          ? "No exercises match your search."
                          : "All exercises added or no match for search."}
                    </p>
                  )}
                </div>
                <div className="create-session-selected">
                  <h3>In this session</h3>
                  <ul className="create-session-exercise-list">
                    {selectedExerciseIds.map((id) => {
                      const ex = exercises.find((e) => e.exercise_id === id);
                      return (
                        <li key={id}>
                          <span className="create-session-exercise-name">{ex?.title ?? `#${id}`}</span>
                          <button
                            type="button"
                            className="create-session-remove-btn"
                            onClick={() => openRemoveConfirm(id)}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedExerciseIds.length === 0 && (
                    <p className="create-session-muted">No exercises in this session yet.</p>
                  )}
                  <button
                    type="button"
                    className="save-btn"
                    onClick={handleSaveExercises}
                    disabled={savingMapping}
                  >
                    {savingMapping ? "Saving…" : "Save exercises"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {isEditMode && !editingModule && !error && loadingModules && (
          <p>Loading session…</p>
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
                onClick={(e) => e.stopPropagation()}
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