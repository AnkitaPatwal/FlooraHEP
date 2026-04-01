import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE, authHeaders } from "./authHeaders";
import { assignPackageAssignmentSessionsPath } from "./assignPackagePaths";
import { AssignBackLink } from "./ui/AssignBackLink";
import { AssignContextStrip } from "./ui/AssignContextStrip";
import "./AssignPackage.css";

type User = {
  id: string;
  email: string | null;
  full_name?: string;
};

type Plan = {
  plan_id: number;
  title: string;
};

type Assignment = {
  id: string;
  package_id: number;
  title: string;
  start_date: string;
  created_at: string;
};

type AssignmentApiRow = Partial<{
  id: string;
  assignment_id: string;
  package_id: number;
  plan_id: number;
  title: string;
  plan_title: string;
  start_date: string;
  created_at: string;
}>;

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayName(user: User): string {
  const n = user.full_name?.trim();
  if (n) return n;
  return user.email || user.id;
}

/** e.g. 2026-03-31 → "March 31, 2026" */
function formatPlanStartDate(iso: string): string {
  const s = iso.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s || "—";
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return s;
  }
  return dt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeAssignmentRow(row: AssignmentApiRow): Assignment | null {
  const rawId = row.id ?? row.assignment_id;
  const id = rawId == null ? "" : String(rawId).trim();
  const rawPackageId = row.package_id ?? row.plan_id;
  const packageId =
    typeof rawPackageId === "number"
      ? rawPackageId
      : typeof rawPackageId === "string"
        ? Number(rawPackageId)
        : NaN;
  if (!id || !Number.isFinite(packageId)) return null;
  return {
    id,
    package_id: packageId,
    title: (row.title ?? row.plan_title ?? `Plan ${packageId}`).trim(),
    start_date: (row.start_date ?? "").trim(),
    created_at: (row.created_at ?? "").trim(),
  };
}

export default function AssignPackageAssignForm() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userLabel, setUserLabel] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayLocalIsoDate);
  const [message, setMessage] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAssignments = useCallback(async (): Promise<Assignment[] | null> => {
    if (!userId) return null;
    const headers = await authHeaders();
    const base = `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}`;

    // Canonical endpoint: assignments (per-user plan assignments).
    // Fallback kept for older backends that still expose `/packages`.
    const tryFetch = async (url: string) => {
      const r = await fetch(url, { headers });
      const j = await r.json().catch(() => null);
      return { r, j };
    };

    const primary = await tryFetch(`${base}/assignments`);
    const picked = primary.r.ok ? primary : await tryFetch(`${base}/packages`);

    if (!picked.r.ok) return null;
    const rows = Array.isArray(picked.j) ? (picked.j as AssignmentApiRow[]) : [];
    const list = rows
      .map(normalizeAssignmentRow)
      .filter((x): x is Assignment => x !== null);
    setAssignments(list);
    return list;
  }, [userId]);

  const loadPage = useCallback(async () => {
    if (!userId) return;
    try {
      setMessage("");
      setLoadingPage(true);
      const headers = await authHeaders();
      const [usersRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/api/assign-package/users`, { headers }),
        fetch(`${API_BASE}/api/assign-package/plans`, { headers }),
      ]);
      const usersData = await usersRes.json();
      const plansData = await plansRes.json();
      if (!usersRes.ok) {
        throw new Error(usersData.error || "Failed to load users.");
      }
      if (!plansRes.ok) {
        throw new Error(plansData.error || "Failed to load plans.");
      }
      const users: User[] = Array.isArray(usersData) ? usersData : [];
      const me = users.find((u) => u.id === userId);
      if (!me) {
        setMessage("User not found or not eligible for assignment.");
        setUserLabel("");
        setAssignments([]);
      } else {
        setUserLabel(displayName(me));
        await loadAssignments();
      }
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load this page.");
    } finally {
      setLoadingPage(false);
    }
  }, [userId, loadAssignments]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const assignedPackageIds = useMemo(
    () => new Set(assignments.map((a) => a.package_id)),
    [assignments],
  );

  const availablePlans = useMemo(
    () => plans.filter((p) => !assignedPackageIds.has(p.plan_id)),
    [plans, assignedPackageIds],
  );

  useEffect(() => {
    if (!planId) return;
    const stillAvailable = availablePlans.some(
      (p) => String(p.plan_id) === planId,
    );
    if (!stillAvailable) setPlanId("");
  }, [planId, availablePlans]);

  const handleAssign = async () => {
    setMessage("");
    if (!userId || !planId || !startDate) {
      setMessage("Please select a plan and start date.");
      return;
    }
    try {
      setLoadingAssign(true);
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/assign-package`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            user_id: userId,
            package_id: Number(planId),
            start_date: startDate,
          }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        assignment_id?: string;
      };
      if (!res.ok) {
        setMessage(data.error || "Failed to assign plan.");
        return;
      }
      const assignedPlanId = Number(planId);
      setPlanId("");
      setStartDate(todayLocalIsoDate());
      const list = await loadAssignments();
      const newAssignmentId =
        data.assignment_id?.trim() ??
        list?.find((row) => row.package_id === assignedPlanId)?.id;
      if (newAssignmentId) {
        navigate(assignPackageAssignmentSessionsPath(userId, newAssignmentId));
        return;
      }
      setMessage("Plan assigned successfully.");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoadingAssign(false);
    }
  };

  const handleDeleteAssignment = async (a: Assignment) => {
    if (!userId) return;
    if (
      !window.confirm(
        `Remove "${a.title}" from this client? Session progress for this plan may be cleared.`,
      )
    ) {
      return;
    }
    setMessage("");
    setDeletingId(a.id);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(a.id)}`,
        { method: "DELETE", headers },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || "Failed to remove plan.");
        return;
      }
      setMessage("Plan removed.");
      await loadAssignments();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!userId) {
    return (
      <div className="assign-package-page">
        <header className="assign-package-header">
          <div className="assign-package-header-left">
            <h1 className="assign-package-title">Assign Plans</h1>
            <p className="assign-package-subtitle">Missing user.</p>
          </div>
        </header>
        <hr className="assign-package-divider" />
        <AssignBackLink to=".." appearance="primary" className="assign-package-primary-btn">
          Back
        </AssignBackLink>
      </div>
    );
  }

  return (
    <div className="assign-package-page">
      <header className="assign-package-header">
        <div className="assign-package-header-left">
          <h1 className="assign-package-title">Assign Plans</h1>
          <p className="assign-package-subtitle">
            Manage plans for a client
          </p>
        </div>
        <div>
          <AssignBackLink to=".." appearance="primary" className="assign-package-primary-btn">
            Back
          </AssignBackLink>
        </div>
      </header>

      <hr className="assign-package-divider" />

      {(loadingPage || userLabel) && (
        <AssignContextStrip
          patientLabel={userLabel || null}
          patientLoading={loadingPage && !userLabel}
        />
      )}

      {message && (
        <p className="assign-package-status" role="status">
          {message}
        </p>
      )}

      {userLabel && (
        <>
          <section style={{ marginBottom: 26 }}>
            <h2 className="assign-package-title" style={{ fontSize: 20 }}>
              Current plans
            </h2>

            {loadingPage && <p className="assign-package-status">Loading…</p>}
            {!loadingPage && assignments.length === 0 && (
              <p className="assign-package-status">
                No plans assigned yet for this client.
              </p>
            )}

            {!loadingPage && assignments.length > 0 && (
              <div
                className="assign-package-grid"
                role="list"
                aria-label="Assigned plans"
              >
                {assignments.map((a) => (
                  <article
                    key={a.id}
                    className="assign-package-card"
                    role="listitem"
                    style={{ cursor: "default" }}
                  >
                    <div className="assign-package-card-inner">
                      <p className="assign-package-card-title">{a.title}</p>
                      <p className="assign-package-card-subtitle">
                        Start date:{" "}
                        {a.start_date
                          ? formatPlanStartDate(a.start_date)
                          : "—"}
                      </p>
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        <Link
                          to={assignPackageAssignmentSessionsPath(userId, a.id)}
                          className="assign-package-outline-btn"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="assign-package-danger-btn"
                          onClick={() => void handleDeleteAssignment(a)}
                          disabled={deletingId === a.id}
                        >
                          {deletingId === a.id ? "Removing…" : "Remove"}
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
              Add a plan
            </h2>

            <div className="assign-package-form" role="form">
              <div className="assign-package-field">
                <label htmlFor="assign-plan">Plan</label>
                <select
                  id="assign-plan"
                  className="assign-package-select"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={loadingPage}
                  aria-label="Plan to assign"
                >
                  <option value="">
                    {loadingPage ? "Loading plans…" : "Select plan"}
                  </option>
                  {availablePlans.map((plan) => (
                    <option key={plan.plan_id} value={String(plan.plan_id)}>
                      {plan.title}
                    </option>
                  ))}
                </select>
                {!loadingPage && plans.length === 0 && (
                  <p className="assign-package-hint">
                    No plans found. Create a plan in the Plans page first.
                  </p>
                )}
                {!loadingPage && plans.length > 0 && availablePlans.length === 0 && (
                  <p className="assign-package-hint">
                    All plans are already assigned to this client.
                  </p>
                )}
              </div>

              <div className="assign-package-field">
                <label htmlFor="start-date">Start date</label>
                <input
                  id="start-date"
                  type="date"
                  className="assign-package-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loadingPage}
                />
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className="assign-package-primary-btn"
                  onClick={handleAssign}
                  disabled={
                    loadingAssign ||
                    loadingPage ||
                    availablePlans.length === 0 ||
                    !planId
                  }
                >
                  {loadingAssign ? "Adding…" : "Add plan"}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
