import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "./authHeaders";
import { LoadingHint } from "./ui/LoadingHint";
import { AssignContextStrip } from "./ui/AssignContextStrip";
import { usePatientLabel } from "./usePatientLabel";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { AssignmentPulseIcon } from "../../components/icons/AssignmentPulseIcon";
import "./AssignPackage.css";
import "../main/CreateSession.css";
import { markAssignmentCountsStale } from "../../lib/assignmentsCountsStale";
import exerciseFallbackImg from "../../assets/exercise.jpg";
import type { ActiveClient } from "../../lib/admin-api";

const EXERCISES_PAGE_SIZE = 100;
const EXERCISES_MAX_PAGES = 200;

type PickerExercise = {
  exercise_id: number;
  title: string;
  description?: string;
  body_part?: string | null;
  thumbnail_url?: string | null;
  assigned_user_count?: number | null;
};

function exerciseCategory(e: PickerExercise): string {
  const p = e.body_part?.trim();
  return p || "Uncategorized";
}

function activeUsersLabel(count: number | null | undefined): string {
  if (count === null || count === undefined) return "—";
  return count === 1 ? "1 Active User" : `${count} Active Users`;
}

type UserProfileNavState = {
  userProfileClient?: ActiveClient;
};

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

  const location = useLocation();
  const navigate = useNavigate();
  const profileState = (location.state ?? {}) as UserProfileNavState;
  const isUsersRoute = location.pathname.startsWith("/users/");

  const navigateBackToSessionsList = () => {
    if (profileState.userProfileClient) {
      navigate("/user-profile", {
        state: { user: profileState.userProfileClient },
      });
      return;
    }
    // Fallback: return to the user list (or just go back if possible).
    if (isUsersRoute) {
      navigate("/users");
      return;
    }
    navigate(-1);
  };

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
      thumbnailUrl: string | null;
    }[]
  >([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState("");
  const [exercisesSuccess, setExercisesSuccess] = useState("");
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [exerciseRemoveTarget, setExerciseRemoveTarget] = useState<{
    rowId: string;
    title: string;
  } | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);
  const [exercisePickerList, setExercisePickerList] = useState<PickerExercise[]>([]);
  const [exercisePickerLoading, setExercisePickerLoading] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [draftByRowId, setDraftByRowId] = useState<
    Record<string, { sets: string; reps: string }>
  >({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
            thumbnailUrl: r.thumbnail_url == null ? null : String(r.thumbnail_url),
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

  useEffect(() => {
    // If the expanded row disappears after reload/remove, collapse.
    if (expandedRowId && !exercises.some((e) => e.rowId === expandedRowId)) {
      setExpandedRowId(null);
    }
  }, [expandedRowId, exercises]);

  // Same exercise catalog + search behavior as Create Session (paginated library).
  useEffect(() => {
    const loadPickerExercises = async () => {
      setExercisePickerLoading(true);
      try {
        const headers = await authHeaders();
        const merged: PickerExercise[] = [];
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
          const batch: PickerExercise[] = (Array.isArray(list) ? list : []).map(
            (row: PickerExercise) => ({
              ...row,
              exercise_id: Number(row.exercise_id),
            }),
          );
          merged.push(...batch);
          if (batch.length < EXERCISES_PAGE_SIZE) break;
        }
        const byId = new Map<number, PickerExercise>();
        for (const e of merged) {
          if (Number.isFinite(e.exercise_id)) byId.set(e.exercise_id, e);
        }
        setExercisePickerList(Array.from(byId.values()));
      } catch {
        setExercisePickerList([]);
      } finally {
        setExercisePickerLoading(false);
      }
    };
    void loadPickerExercises();
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
          thumbnailUrl: r.thumbnail_url == null ? null : String(r.thumbnail_url),
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
    setExercisesSuccess("");
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
    setExercisesSuccess("");
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
      setExercisesError("");
      setDraftByRowId((prev) => ({ ...prev, [rowId]: { sets: "", reps: "" } }));
      await reloadExercises();
      setExercisesSuccess("Sets and reps saved for this client.");
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
    setExercisesSuccess("");
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
      setExercisesError("");
      setDraftByRowId((prev) => ({ ...prev, [rowId]: { sets: "", reps: "" } }));
      await reloadExercises();
      setExercisesSuccess("Sets and reps saved for this client.");
    } catch {
      setExercisesError("Something went wrong.");
    } finally {
      setSavingRowId(null);
    }
  };

  const executeRemoveExercise = async (rowId: string) => {
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
        markAssignmentCountsStale();
        setExerciseRemoveTarget(null);
        setExercisesError("");
        await reloadExercises();
        setExercisesSuccess("Exercise removed for this client.");
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
        markAssignmentCountsStale();
        setExerciseRemoveTarget(null);
        setExercisesError("");
        await reloadExercises();
        setExercisesSuccess("Exercise removed for this client.");
      } catch {
        setExercisesError("Something went wrong.");
      } finally {
        setSavingRowId(null);
      }
    }
  };

  const assignedExerciseIds = useMemo(() => {
    return new Set(
      exercises.map((e) => e.exerciseId).filter((n) => Number.isFinite(n)),
    );
  }, [exercises]);

  const addExercise = async (exerciseId: number) => {
    if (!userId || !assignmentId || !Number.isFinite(mid)) return;
    const exId = Number(exerciseId);
    if (!Number.isFinite(exId)) return;
    if (assignedExerciseIds.has(exId)) return;
    setAddingBusy(true);
    setExercisesError("");
    setExercisesSuccess("");
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
      markAssignmentCountsStale();
      await reloadExercises();
      setExercisesSuccess("Exercise added for this client.");
    } catch {
      setExercisesError("Something went wrong.");
    } finally {
      setAddingBusy(false);
    }
  };

  const searchTrim = exerciseSearch.trim().toLowerCase();
  const searchFirstLetter = searchTrim.charAt(0);
  const filteredPickerExercises = useMemo(() => {
    return exercisePickerList.filter((e) => {
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
  }, [exercisePickerList, searchFirstLetter]);

  const exercisesByCategory = useMemo(() => {
    const map: Record<string, PickerExercise[]> = {};
    for (const e of filteredPickerExercises) {
      const cat = exerciseCategory(e);
      if (!map[cat]) map[cat] = [];
      map[cat].push(e);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return map;
  }, [filteredPickerExercises]);

  const sortedCategoryKeys = useMemo(() => {
    return Object.keys(exercisesByCategory).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [exercisesByCategory]);

  if (!userId || !assignmentId || !Number.isFinite(mid)) {
    return (
      <div className="assign-package-page">
        <header className="assign-package-header">
          <div className="assign-package-header-left">
            <h1 className="assign-package-title">Exercise details</h1>
            <p className="assign-package-subtitle">Missing route parameters.</p>
          </div>
        </header>
        <hr className="assign-package-divider" />
        <button
          type="button"
          className="assign-package-primary-btn"
          onClick={navigateBackToSessionsList}
        >
          Back
        </button>
      </div>
    );
  }

  const metaInitial = metaLoading && !planMeta;

  return (
    <div className="assign-package-page">
      <header className="assign-package-header">
        <div className="assign-package-header-left">
          <h1 className="assign-package-title">Exercise details</h1>
        </div>
        <button
          type="button"
          className="assign-package-primary-btn"
          onClick={navigateBackToSessionsList}
        >
          Back to sessions
        </button>
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
        {exercisesSuccess && !exercisesError && (
          <p className="assign-package-status success" role="status">
            {exercisesSuccess}
          </p>
        )}
        {exercisesLoading && (
          <LoadingHint message="Loading exercises for this patient…" />
        )}
        {!exercisesLoading && exercises.length === 0 && (
          <p className="assign-package-status">No exercises in this session yet.</p>
        )}
        {!exercisesLoading && exercises.length > 0 && (
          <div className="patient-session-exercises-grid" role="list" aria-label="Exercises">
            {exercises.map((row) => (
              <article
                key={row.rowId}
                className={`patient-session-exercise-card ${
                  expandedRowId === row.rowId ? "is-expanded" : ""
                }`}
                role="listitem"
                onClick={() =>
                  setExpandedRowId((prev) => (prev === row.rowId ? null : row.rowId))
                }
              >
                <div className="patient-session-exercise-card-inner">
                  <div className="patient-session-exercise-media">
                    <img
                      className="patient-session-exercise-thumb"
                      src={(row.thumbnailUrl ?? "").trim() || exerciseFallbackImg}
                      alt={row.title}
                      loading="lazy"
                    />
                  </div>
                  <div className="patient-session-exercise-body">
                    <p className="patient-session-exercise-title">{row.title}</p>
                    {(row.description ?? "").trim() ? (
                      <p className="patient-session-exercise-subtitle">
                        {(row.description ?? "").trim()}
                      </p>
                    ) : null}
                  </div>

                  {expandedRowId === row.rowId ? (
                    <div
                      className="patient-session-exercise-editor"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="patient-session-exercise-fields">
                        <label className="patient-session-exercise-field">
                          <span>Sets</span>
                          <input
                            type="number"
                            className="assign-package-input"
                            min={1}
                            max={99}
                            value={draftByRowId[row.rowId]?.sets ?? ""}
                            placeholder={String(row.sets)}
                            onChange={(e) =>
                              updateDraft(row.rowId, { sets: e.target.value })
                            }
                            disabled={savingRowId === row.rowId}
                            aria-label={`Sets for ${row.title}`}
                          />
                        </label>
                        <label className="patient-session-exercise-field">
                          <span>Reps</span>
                          <input
                            type="number"
                            className="assign-package-input"
                            min={1}
                            max={999}
                            value={draftByRowId[row.rowId]?.reps ?? ""}
                            placeholder={String(row.reps)}
                            onChange={(e) =>
                              updateDraft(row.rowId, { reps: e.target.value })
                            }
                            disabled={savingRowId === row.rowId}
                            aria-label={`Reps for ${row.title}`}
                          />
                        </label>
                      </div>

                      <div className="patient-session-exercise-actions">
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
                          onClick={() => {
                            setExercisesSuccess("");
                            setExerciseRemoveTarget({
                              rowId: row.rowId,
                              title: row.title,
                            });
                          }}
                          disabled={savingRowId === row.rowId}
                        >
                          {savingRowId === row.rowId ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="patient-session-add-exercises">
        <div className="create-session-panel-body" style={{ paddingTop: 0 }}>
          <div className="create-session-exercises-toolbar">
            <div className="create-session-exercises-heading">
              <h2 className="assign-package-title create-session-select-title" style={{ fontSize: 20 }}>
                Add Exercise
              </h2>
              <span className="create-session-exercises-total">
                {exercisePickerList.length} Exercises
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
                disabled={exercisePickerLoading || addingBusy}
                aria-label="Search exercises"
              />
            </div>
          </div>

          <hr className="create-session-exercises-divider" />

          {exercisePickerLoading ? (
            <p className="assign-package-hint">Loading exercises…</p>
          ) : exercisePickerList.length === 0 ? (
            <p className="assign-package-hint">No exercises available.</p>
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
                      const inSession = assignedExerciseIds.has(e.exercise_id);
                      return (
                        <button
                          key={e.exercise_id}
                          type="button"
                          className={`create-session-exercise-card${inSession ? " is-selected" : ""}`}
                          disabled={addingBusy || inSession}
                          onClick={() => void addExercise(e.exercise_id)}
                        >
                          <img
                            src={e.thumbnail_url?.trim() || exerciseFallbackImg}
                            alt=""
                            className="create-session-exercise-card-img"
                          />
                          <div className="create-session-exercise-card-body">
                            <h4 className="create-session-exercise-card-title">{e.title}</h4>
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
      </section>

      <ConfirmDialog
        open={exerciseRemoveTarget != null}
        title="Remove exercise for this user?"
        message={
          exerciseRemoveTarget
            ? `Remove “${exerciseRemoveTarget.title}” from this session for this user? This won’t change the global exercise library.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        busy={
          exerciseRemoveTarget != null &&
          savingRowId === exerciseRemoveTarget.rowId
        }
        onConfirm={() => {
          if (exerciseRemoveTarget) {
            void executeRemoveExercise(exerciseRemoveTarget.rowId);
          }
        }}
        onCancel={() => {
          if (savingRowId === null) setExerciseRemoveTarget(null);
        }}
      />
    </div>
  );
}
