import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "./authHeaders";
import { assignPackageAssignmentSessionsPath } from "./assignPackagePaths";
import { LoadingHint } from "./ui/LoadingHint";
import { AssignContextStrip } from "./ui/AssignContextStrip";
import { usePatientLabel } from "./usePatientLabel";
import { AssignBackLink } from "./ui/AssignBackLink";
import "./AssignPackage.css";

type SessionRow = {
  order_index: number;
  module_id: number;
  title: string;
  session_number: number | null;
};

type SessionsPayload = {
  plan_title: string;
  start_date: string;
  sessions: SessionRow[];
};

function sessionHeading(s: SessionRow): string {
  if (s.session_number != null) {
    return `Session ${s.session_number}: ${s.title}`;
  }
  return s.title;
}

export default function AssignPackagePatientSession() {
  const { userId, assignmentId, moduleId } = useParams<{
    userId: string;
    assignmentId: string;
    moduleId: string;
  }>();
  const mid = moduleId ? Number(moduleId) : NaN;

  const { patientLabel, patientLabelLoading } = usePatientLabel(userId);

  const [planMeta, setPlanMeta] = useState<{
    planTitle: string;
    startDate: string;
    sessionTitle: string;
  } | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");

  const [exercises, setExercises] = useState<
    {
      rowId: string;
      kind: "template" | "added";
      moduleExerciseId?: number;
      addedId?: string;
      exerciseId: number;
      title: string;
      sets: number;
      reps: number;
      description: string | null;
    }[]
  >([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState("");
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [addingExerciseId, setAddingExerciseId] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [library, setLibrary] = useState<Array<{ id: number; title: string }>>(
    [],
  );
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [draftByRowId, setDraftByRowId] = useState<
    Record<string, { sets: string; reps: string }>
  >({});

  const loadMeta = useCallback(async () => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    setMetaError("");
    setMetaLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions`,
        { headers },
      );
      const body = (await res.json()) as SessionsPayload & { error?: string };
      if (!res.ok) {
        setPlanMeta(null);
        setMetaError(body.error || "Failed to load plan.");
        return;
      }
      const row = body.sessions.find((s) => s.module_id === mid);
      setPlanMeta({
        planTitle: body.plan_title,
        startDate: body.start_date,
        sessionTitle: row
          ? sessionHeading(row as SessionRow)
          : `Module ${mid}`,
      });
    } catch {
      setPlanMeta(null);
      setMetaError("Something went wrong.");
    } finally {
      setMetaLoading(false);
    }
  }, [userId, assignmentId, mid]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const loadExercises = async () => {
      if (!userId || !assignmentId || !Number.isFinite(mid)) return;
      setExercisesError("");
      setExercisesLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises`,
          { headers },
        );
        const body = (await res.json()) as
          | {
              module_id: number;
              exercises: Array<{
                id: string;
                kind: "template" | "added";
                module_exercise_id?: number;
                user_assignment_exercise_id?: string;
                order_index: number;
                exercise_id: number | string;
                title: string;
                description: string | null;
                sets: number;
                reps: number;
              }>;
              error?: string;
            }
          | { error?: string };

        if (!res.ok) {
          const msg =
            (body as any)?.error || "Failed to load exercises for this session.";
          setExercises([]);
          setExercisesError(msg);
          return;
        }

        const list = Array.isArray((body as any).exercises)
          ? (body as any).exercises
          : [];
        setExercises(
          list.map((r: any) => ({
            rowId: String(r.id ?? r.module_exercise_id ?? r.user_assignment_exercise_id ?? r.exercise_id ?? r.order_index),
            kind: r.kind === "added" ? "added" : "template",
            moduleExerciseId:
              r.module_exercise_id != null ? Number(r.module_exercise_id) : undefined,
            addedId:
              r.user_assignment_exercise_id != null
                ? String(r.user_assignment_exercise_id)
                : undefined,
            exerciseId: Number(r.exercise_id),
            title: String(r.title ?? ""),
            sets: Number(r.sets ?? 1),
            reps: Number(r.reps ?? 1),
            description: r.description ?? null,
          })),
        );
      } catch {
        setExercises([]);
        setExercisesError("Something went wrong.");
      } finally {
        setExercisesLoading(false);
      }
    };

    void loadExercises();
  }, [userId, assignmentId, mid]);

  // Lightweight exercise library for "add exercise" (first page, no search yet).
  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/exercises?page=1&pageSize=100`);
        const body = (await res.json()) as any;
        const rows = Array.isArray(body?.data) ? body.data : [];
        setLibrary(
          rows
            .map((r: any) => ({
              id: Number(r.exercise_id),
              title: String(r.title ?? ""),
            }))
            .filter((r: any) => Number.isFinite(r.id) && r.title),
        );
      } catch {
        setLibrary([]);
      } finally {
        setLibraryLoading(false);
      }
    };
    void loadLibrary();
  }, []);

  const reloadExercises = useCallback(async () => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    setExercisesError("");
    setExercisesLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises`,
        { headers },
      );
      const body = (await res.json()) as any;
      if (!res.ok) {
        setExercises([]);
        setExercisesError(body?.error || "Failed to reload exercises.");
        return;
      }
      const list = Array.isArray(body?.exercises) ? body.exercises : [];
      setExercises(
        list.map((r: any) => ({
          rowId: String(
            r.id ??
              r.module_exercise_id ??
              r.user_assignment_exercise_id ??
              r.exercise_id ??
              r.order_index,
          ),
          kind: r.kind === "added" ? "added" : "template",
          moduleExerciseId:
            r.module_exercise_id != null ? Number(r.module_exercise_id) : undefined,
          addedId:
            r.user_assignment_exercise_id != null
              ? String(r.user_assignment_exercise_id)
              : undefined,
          exerciseId: Number(r.exercise_id),
          title: String(r.title ?? ""),
          sets: Number(r.sets ?? 1),
          reps: Number(r.reps ?? 1),
          description: r.description ?? null,
        })),
      );
    } catch {
      setExercises([]);
      setExercisesError("Something went wrong.");
    } finally {
      setExercisesLoading(false);
    }
  }, [userId, assignmentId, mid]);

  const updateDraft = (rowId: string, patch: Partial<{ sets: string; reps: string }>) => {
    setDraftByRowId((prev) => ({
      ...prev,
      [rowId]: { sets: prev[rowId]?.sets ?? "", reps: prev[rowId]?.reps ?? "", ...patch },
    }));
  };

  const saveTemplateOverrides = async (rowId: string) => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    const row = exercises.find((r) => r.rowId === rowId);
    if (!row?.moduleExerciseId) return;
    const draft = draftByRowId[rowId] ?? { sets: "", reps: "" };
    const hasSets = draft.sets.trim() !== "";
    const hasReps = draft.reps.trim() !== "";
    if (!hasSets && !hasReps) return;
    setSavingRowId(rowId);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises/${encodeURIComponent(String(row.moduleExerciseId))}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            ...(hasSets ? { sets: Number(draft.sets) } : {}),
            ...(hasReps ? { reps: Number(draft.reps) } : {}),
            removed: false,
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExercisesError(body?.error || "Failed to save overrides.");
        return;
      }
      setDraftByRowId((prev) => ({ ...prev, [rowId]: { sets: "", reps: "" } }));
      await reloadExercises();
    } catch {
      setExercisesError("Something went wrong.");
    } finally {
      setSavingRowId(null);
    }
  };

  const saveAddedOverrides = async (rowId: string) => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    const row = exercises.find((r) => r.rowId === rowId);
    if (!row?.addedId) return;
    const draft = draftByRowId[rowId] ?? { sets: "", reps: "" };
    const hasSets = draft.sets.trim() !== "";
    const hasReps = draft.reps.trim() !== "";
    if (!hasSets && !hasReps) return;
    setSavingRowId(rowId);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises/added/${encodeURIComponent(row.addedId)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            ...(hasSets ? { sets: Number(draft.sets) } : {}),
            ...(hasReps ? { reps: Number(draft.reps) } : {}),
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExercisesError(body?.error || "Failed to save overrides.");
        return;
      }
      setDraftByRowId((prev) => ({ ...prev, [rowId]: { sets: "", reps: "" } }));
      await reloadExercises();
    } catch {
      setExercisesError("Something went wrong.");
    } finally {
      setSavingRowId(null);
    }
  };

  const removeRow = async (rowId: string) => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    const row = exercises.find((r) => r.rowId === rowId);
    if (!row) return;

    if (row.kind === "template" && row.moduleExerciseId) {
      setSavingRowId(rowId);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises/${encodeURIComponent(String(row.moduleExerciseId))}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ removed: true }),
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setExercisesError(body?.error || "Failed to remove exercise.");
          return;
        }
        await reloadExercises();
      } catch {
        setExercisesError("Something went wrong.");
      } finally {
        setSavingRowId(null);
      }
      return;
    }

    if (row.kind === "added" && row.addedId) {
      setSavingRowId(rowId);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises/added/${encodeURIComponent(row.addedId)}`,
          { method: "DELETE", headers },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setExercisesError(body?.error || "Failed to remove added exercise.");
          return;
        }
        await reloadExercises();
      } catch {
        setExercisesError("Something went wrong.");
      } finally {
        setSavingRowId(null);
      }
    }
  };

  const addExercise = async () => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    const exId = Number(addingExerciseId);
    if (!Number.isFinite(exId)) return;
    setAddingBusy(true);
    setExercisesError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(mid))}/exercises`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ exercise_id: exId }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExercisesError(body?.error || "Failed to add exercise.");
        return;
      }
      setAddingExerciseId("");
      await reloadExercises();
    } catch {
      setExercisesError("Something went wrong.");
    } finally {
      setAddingBusy(false);
    }
  };

  const assignedExerciseIds = useMemo(() => {
    return new Set(
      exercises.map((e) => e.exerciseId).filter((n) => Number.isFinite(n)),
    );
  }, [exercises]);

  const availableLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    return library
      .filter((e) => !assignedExerciseIds.has(e.id))
      .filter((e) => !q || e.title.toLowerCase().includes(q));
  }, [library, assignedExerciseIds, libraryQuery]);

  if (!userId || !assignmentId || !Number.isFinite(mid)) {
    return (
      <div className="assign-package-page">
        <header className="assign-package-header">
          <div className="assign-package-header-left">
            <h1 className="assign-package-title">Assign Package</h1>
            <p className="assign-package-subtitle">Missing route parameters.</p>
          </div>
        </header>
        <hr className="assign-package-divider" />
        <AssignBackLink to="/assign-package" className="assign-package-link-btn">
          Back
        </AssignBackLink>
      </div>
    );
  }

  const backSessions = assignPackageAssignmentSessionsPath(userId, assignmentId);

  const metaInitial = metaLoading && !planMeta;

  return (
    <div className="assign-package-page">
      <header className="assign-package-header">
        <div className="assign-package-header-left">
          <h1 className="assign-package-title">Session details</h1>
          <p className="assign-package-subtitle">Manage exercises for this client</p>
        </div>
        <AssignBackLink to={backSessions} className="assign-package-link-btn">
          Back to sessions
        </AssignBackLink>
      </header>

      <hr className="assign-package-divider" />

      <AssignContextStrip
        patientLabel={patientLabel}
        patientLoading={patientLabelLoading}
        planName={planMeta?.planTitle ?? null}
        sessionName={planMeta?.sessionTitle ?? null}
      />

      {metaError && (
        <p className="assign-package-status error" role="alert">
          {metaError}
        </p>
      )}
      {metaInitial && !metaError && (
        <LoadingHint message="Loading session and plan details…" />
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 className="assign-package-title" style={{ fontSize: 20 }}>
          Exercises
        </h2>
        {exercisesError && (
          <p className="assign-package-status error" role="alert">
            {exercisesError}
          </p>
        )}
        {exercisesLoading && (
          <LoadingHint message="Loading exercises for this patient…" />
        )}
        {!exercisesLoading && exercises.length === 0 && (
          <p className="assign-package-status">No exercises in this session yet.</p>
        )}
        {!exercisesLoading && exercises.length > 0 && (
          <div className="assign-package-grid" role="list" aria-label="Exercises">
            {exercises.map((row) => (
              <article
                key={row.rowId}
                className="assign-package-card"
                role="listitem"
                style={{ cursor: "default" }}
              >
                <div className="assign-package-card-inner">
                  <p className="assign-package-card-title">{row.title}</p>
                  {row.description ? (
                    <p className="assign-package-card-subtitle">{row.description}</p>
                  ) : null}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "0 1 120px" }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>
                        Sets
                        <input
                          type="number"
                          className="assign-package-input"
                          min={1}
                          max={99}
                          value={draftByRowId[row.rowId]?.sets ?? ""}
                          placeholder={String(row.sets)}
                          onChange={(e) => updateDraft(row.rowId, { sets: e.target.value })}
                          disabled={savingRowId === row.rowId}
                          aria-label={`Sets for ${row.title}`}
                          style={{ minHeight: 40 }}
                        />
                      </label>
                    </div>
                    <div style={{ flex: "0 1 120px" }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>
                        Reps
                        <input
                          type="number"
                          className="assign-package-input"
                          min={1}
                          max={999}
                          value={draftByRowId[row.rowId]?.reps ?? ""}
                          placeholder={String(row.reps)}
                          onChange={(e) => updateDraft(row.rowId, { reps: e.target.value })}
                          disabled={savingRowId === row.rowId}
                          aria-label={`Reps for ${row.title}`}
                          style={{ minHeight: 40 }}
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    {row.kind === "template" ? (
                      <button
                        type="button"
                        className="assign-package-primary-btn"
                        onClick={() => void saveTemplateOverrides(row.rowId)}
                        disabled={
                          savingRowId === row.rowId ||
                          ((draftByRowId[row.rowId]?.sets ?? "").trim() === "" &&
                            (draftByRowId[row.rowId]?.reps ?? "").trim() === "")
                        }
                      >
                        {savingRowId === row.rowId ? "Saving…" : "Save"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="assign-package-primary-btn"
                        onClick={() => void saveAddedOverrides(row.rowId)}
                        disabled={
                          savingRowId === row.rowId ||
                          ((draftByRowId[row.rowId]?.sets ?? "").trim() === "" &&
                            (draftByRowId[row.rowId]?.reps ?? "").trim() === "")
                        }
                      >
                        {savingRowId === row.rowId ? "Saving…" : "Save"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="assign-package-danger-btn"
                      onClick={() => void removeRow(row.rowId)}
                      disabled={savingRowId === row.rowId}
                    >
                      {savingRowId === row.rowId ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="assign-package-title" style={{ fontSize: 20 }}>
          Add/remove exercises
        </h2>
        <div className="assign-package-form">
          <div className="assign-package-field">
            <label htmlFor="exercise-search">Search</label>
            <input
              id="exercise-search"
              type="search"
              className="assign-package-input"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search exercises…"
              disabled={libraryLoading || addingBusy}
            />
          </div>
          <div className="assign-package-field">
            <label htmlFor="add-exercise">Exercise</label>
            <select
              id="add-exercise"
              className="assign-package-select"
              value={addingExerciseId}
              onChange={(e) => setAddingExerciseId(e.target.value)}
              disabled={libraryLoading || addingBusy}
            >
              <option value="">
                {libraryLoading ? "Loading…" : "Select exercise"}
              </option>
              {availableLibrary.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.title}
                </option>
              ))}
            </select>
            {!libraryLoading && library.length > 0 && availableLibrary.length === 0 && (
              <p className="assign-package-hint">
                No exercises available to add (all are already in this session, or none match your search).
              </p>
            )}
          </div>
          <button
            type="button"
            className="assign-package-primary-btn"
            onClick={() => void addExercise()}
            disabled={addingBusy || libraryLoading || !addingExerciseId}
          >
            {addingBusy ? "Adding…" : "Add exercise"}
          </button>
          <p className="assign-package-hint">
            These changes are stored per patient+plan assignment and won’t affect the
            global plan template.
          </p>
        </div>
      </section>
    </div>
  );
}
