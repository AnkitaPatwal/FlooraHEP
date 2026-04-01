import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "./authHeaders";
import {
  assignPackageClientPath,
  assignPackagePatientSessionPath,
} from "./assignPackagePaths";
import { usePatientLabel } from "./usePatientLabel";
import { ConfirmModal } from "./ui/ConfirmModal";
import { LoadingHint } from "./ui/LoadingHint";
import { AssignBackLink } from "./ui/AssignBackLink";
import { AssignContextStrip } from "./ui/AssignContextStrip";
import "./AssignPackage.css";

type SessionRow = {
  order_index: number;
  module_id: number;
  title: string;
  description: string | null;
  session_number: number | null;
  is_unlocked: boolean;
  unlock_date: string | null;
};

type SessionsPayload = {
  plan_id: number;
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

function toDateInputValue(iso: string): string {
  if (!iso || iso.length < 10) return "";
  return iso.slice(0, 10);
}

function sortIncludedSessions(rows: SessionRow[]): SessionRow[] {
  return [...rows].sort((a, b) => a.order_index - b.order_index);
}

export default function AssignPackageAssignmentSessions() {
  const { userId, assignmentId } = useParams<{
    userId: string;
    assignmentId: string;
  }>();
  const { patientLabel, patientLabelLoading } = usePatientLabel(userId);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<SessionsPayload | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [moduleLibrary, setModuleLibrary] = useState<
    Array<{ module_id: number; title: string; session_number: number | null }>
  >([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [removeModal, setRemoveModal] = useState<{
    moduleId: number;
    label: string;
  } | null>(null);
  const [startDateDraft, setStartDateDraft] = useState("");
  const [savingStartDate, setSavingStartDate] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !assignmentId) return;
    setMessage("");
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions`,
        { headers },
      );
      const body = (await res.json()) as SessionsPayload & { error?: string };
      if (!res.ok) {
        setData(null);
        setMessage(body.error || "Failed to load sessions.");
        return;
      }
      setData(body);
    } catch {
      setData(null);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [userId, assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const loadModules = async () => {
      setModuleLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/assign-package/modules`, {
          headers,
        });
        const body = await res.json().catch(() => []);
        if (!res.ok) {
          setModuleLibrary([]);
          return;
        }
        const list = Array.isArray(body) ? body : [];
        setModuleLibrary(
          list
            .map((r: any) => ({
              module_id: Number(r.module_id),
              title: String(r.title ?? ""),
              session_number:
                r.session_number == null ? null : Number(r.session_number),
            }))
            .filter((m: any) => Number.isFinite(m.module_id) && m.title),
        );
      } catch {
        setModuleLibrary([]);
      } finally {
        setModuleLoading(false);
      }
    };
    void loadModules();
  }, []);

  useEffect(() => {
    if (data?.start_date) {
      setStartDateDraft(toDateInputValue(data.start_date));
    }
  }, [data?.start_date]);

  const includedSessions = useMemo(
    () =>
      sortIncludedSessions(
        (data?.sessions ?? []).filter((s) => s.is_unlocked),
      ),
    [data],
  );

  const includedIds = useMemo(
    () => new Set(includedSessions.map((s) => s.module_id)),
    [includedSessions],
  );
  const availableModulesToAdd = useMemo(() => {
    return moduleLibrary
      .filter((m) => !includedIds.has(m.module_id))
      .slice()
      .sort((a, b) => {
        const an = a.session_number ?? 999999;
        const bn = b.session_number ?? 999999;
        if (an !== bn) return an - bn;
        return a.title.localeCompare(b.title);
      });
  }, [moduleLibrary, includedIds]);

  useEffect(() => {
    setSelectedModuleId((prev) => {
      if (
        prev &&
        availableModulesToAdd.some((s) => String(s.module_id) === prev)
      ) {
        return prev;
      }
      return "";
    });
  }, [availableModulesToAdd]);

  const handleSaveStartDate = async () => {
    if (!userId || !assignmentId || !startDateDraft) return;
    setMessage("");
    setSavingStartDate(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ start_date: startDateDraft }),
        },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error || "Failed to update start date.");
        return;
      }
      await load();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setSavingStartDate(false);
    }
  };

  const handleAddSession = async () => {
    if (!userId || !assignmentId || !selectedModuleId) {
      setMessage("Please select a session to add.");
      return;
    }
    setMessage("");
    setAdding(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ module_id: Number(selectedModuleId) }),
        },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error || "Failed to add session.");
        return;
      }
      setSelectedModuleId("");
      await load();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setAdding(false);
    }
  };

  const runRemoveSession = async () => {
    if (!userId || !assignmentId || !removeModal) return;
    const moduleId = removeModal.moduleId;
    setMessage("");
    setRemovingId(moduleId);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}/sessions/${encodeURIComponent(String(moduleId))}`,
        { method: "DELETE", headers },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error || "Failed to remove session.");
        return;
      }
      setRemoveModal(null);
      await load();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setRemovingId(null);
    }
  };

  if (!userId || !assignmentId) {
    return (
      <div className="assign-package-page">
        <header className="assign-package-header">
          <div className="assign-package-header-left">
            <h1 className="assign-package-title">Assign Plans</h1>
            <p className="assign-package-subtitle">Missing user or assignment.</p>
          </div>
        </header>
        <hr className="assign-package-divider" />
        <AssignBackLink to="/assign-package" appearance="primary" className="assign-package-primary-btn">
          Back
        </AssignBackLink>
      </div>
    );
  }

  const initialLoad = loading && !data;
  const startDateDirty =
    data &&
    startDateDraft &&
    toDateInputValue(data.start_date) !== startDateDraft;

  return (
    <div className="assign-package-page">
      <header className="assign-package-header">
        <div className="assign-package-header-left">
          <h1 className="assign-package-title">Assigned sessions</h1>
        </div>
        <AssignBackLink
          to={assignPackageClientPath(userId)}
          appearance="primary"
          className="assign-package-primary-btn"
        >
          Back to client
        </AssignBackLink>
      </header>

      <hr className="assign-package-divider" />

      {initialLoad && (
        <LoadingHint message="Loading plan and sessions for this patient…" />
      )}
      {message && (
        <p className="assign-package-status" role="status">
          {message}
        </p>
      )}

      {data && (
        <>
          <AssignContextStrip
            patientLabel={patientLabel}
            patientLoading={patientLabelLoading}
            planName={data.plan_title}
          />

          <section style={{ marginBottom: 18 }}>
            <h2 className="assign-package-title" style={{ fontSize: 20 }}>
              Edit Start date
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ minWidth: 220, flex: "0 1 260px" }}>
                <input
                  id="plan-start-date-edit"
                  type="date"
                  className="assign-package-input"
                  value={startDateDraft}
                  onChange={(e) => setStartDateDraft(e.target.value)}
                  disabled={loading || savingStartDate}
                  aria-label="Edit plan start date"
                />
              </div>
              <div style={{ alignSelf: "end" }}>
                <button
                  type="button"
                  className="assign-package-primary-btn"
                  onClick={() => void handleSaveStartDate()}
                  disabled={
                    savingStartDate ||
                    loading ||
                    !startDateDraft ||
                    !startDateDirty
                  }
                >
                  {savingStartDate ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 className="assign-package-title" style={{ fontSize: 20 }}>
              Current sessions
            </h2>
            {loading && !initialLoad && (
              <LoadingHint inline message="Updating sessions…" />
            )}
            {!loading && includedSessions.length === 0 && (
              <p className="assign-package-status">No sessions included yet.</p>
            )}
            {!loading && includedSessions.length > 0 && (
              <div
                className="assign-package-grid"
                role="list"
                aria-label="Current sessions"
              >
                {includedSessions.map((s) => {
                  return (
                    <article
                      key={s.module_id}
                      className="assign-package-card"
                      role="listitem"
                      style={{ cursor: "default" }}
                    >
                      <div className="assign-package-card-inner">
                        <p className="assign-package-card-title">
                          {sessionHeading(s)}
                        </p>
                        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                          <Link
                            to={assignPackagePatientSessionPath(
                              userId,
                              assignmentId,
                              s.module_id,
                            )}
                            className="assign-package-outline-btn"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="assign-package-danger-btn"
                            onClick={() =>
                              setRemoveModal({
                                moduleId: s.module_id,
                                label: sessionHeading(s),
                              })
                            }
                            disabled={removingId === s.module_id}
                          >
                            {removingId === s.module_id
                              ? "Removing…"
                              : "Remove"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="assign-package-title" style={{ fontSize: 20 }}>
              Add a session
            </h2>
            <div className="assign-package-form">
              <div className="assign-package-field">
                <select
                  id="add-session-select"
                  className="assign-package-select"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  disabled={
                    loading ||
                    adding ||
                    moduleLoading ||
                    availableModulesToAdd.length === 0
                  }
                  aria-label="Select session to add"
                >
                  <option value="">
                    {loading || moduleLoading ? "Loading…" : "Select session"}
                  </option>
                  {availableModulesToAdd.map((m) => (
                    <option key={m.module_id} value={String(m.module_id)}>
                      {m.session_number != null
                        ? `Session ${m.session_number}: ${m.title}`
                        : m.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="assign-package-primary-btn"
                onClick={() => void handleAddSession()}
                disabled={
                  adding ||
                  loading ||
                  moduleLoading ||
                  availableModulesToAdd.length === 0 ||
                  !selectedModuleId
                }
              >
                {adding ? "Adding…" : "Add session"}
              </button>
            </div>
            {!loading && !moduleLoading && availableModulesToAdd.length === 0 && (
              <p className="assign-package-hint">
                No sessions available to add for this client.
              </p>
            )}
          </section>
        </>
      )}

      <ConfirmModal
        open={!!removeModal}
        title="Remove session for this patient?"
        message={
          removeModal
            ? `Remove “${removeModal.label}” for this patient? Progress for this session may be cleared.`
            : ""
        }
        confirmLabel="Remove"
        destructive
        busy={removingId !== null}
        onConfirm={() => void runRemoveSession()}
        onCancel={() => {
          if (removingId === null) setRemoveModal(null);
        }}
      />
    </div>
  );
}
