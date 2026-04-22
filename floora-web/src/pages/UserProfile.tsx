import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import UserAvatar from "../components/common/UserAvatar";
import SessionNestedDropdown from "../components/SessionNestedDropdown";
import PlanSelectDropdown from "../components/PlanSelectDropdown";
import {
  deleteClient,
  fetchActiveClients,
  fetchClientProfileAvatar,
  type ActiveClient,
} from "../lib/admin-api";
import "../components/UserProfile.css";
import { API_BASE, authHeaders } from "./assignPackage/authHeaders";
import { markAssignmentCountsStale } from "../lib/assignmentsCountsStale";
import sessionFallbackImg from "../assets/exercise.jpg";
const DEFAULT_ADMIN_ID = 1;

type AssignUser = {
  id: string;
  email: string | null;
  full_name?: string;
};

type AssignPlan = {
  plan_id: number;
  title: string;
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
  session_layout_published_at: string | null;
}>;

type Assignment = {
  id: string;
  package_id: number;
  title: string;
  start_date: string;
  created_at: string;
  /** Null until clinician publishes from Edit User. */
  session_layout_published_at: string | null;
};

type AssignmentSessionRow = {
  order_index: number;
  module_id: number;
  title: string;
  description: string | null;
  session_number: number | null;
  unlock_date: string | null;
  /** Patient truth: unlock row date (null = not unlocked yet). */
  patient_unlock_date?: string | null;
  /** Patient truth: unlocked now (based on unlock table + date). */
  patient_is_unlocked?: boolean;
  /** Patient truth: completed (exists in completion table). */
  patient_is_completed?: boolean;
  thumbnail_url?: string | null;
  kind?: "template" | "added";
  user_assignment_session_id?: string;
  /** Patient unlock / grid order (0-based). From API after step 2. */
  unlock_sequence?: number | null;
  phase_index?: number | null;
  phase_title?: string | null;
  slot_index?: number | null;
};

/** Match assign-package GET: unlock_sequence first, then legacy order_index. */
function sortIncludedAssignmentSessions(
  sessions: Array<AssignmentSessionRow & { is_unlocked?: boolean }>,
): Array<AssignmentSessionRow & { is_unlocked?: boolean }> {
  return [...sessions].sort((a, c) => {
    const au = a.unlock_sequence;
    const cu = c.unlock_sequence;
    if (au != null && cu != null && Number(au) !== Number(cu)) return Number(au) - Number(cu);
    if (au != null && cu == null) return -1;
    if (au == null && cu != null) return 1;
    return (
      Number(a.order_index ?? 0) - Number(c.order_index ?? 0) || a.module_id - c.module_id
    );
  });
}

type SessionsPayload = {
  plan_id: number;
  plan_title: string;
  start_date: string | null;
  session_layout_published_at?: string | null;
  sessions: Array<
    AssignmentSessionRow & {
      is_unlocked: boolean;
    }
  >;
};

type ModuleLibraryRow = {
  module_id: number;
  title: string;
  description: string | null;
  session_number: number | null;
  thumbnail_url?: string | null;
};

function toDateInputValue(iso: string): string {
  if (!iso || iso.length < 10) return "";
  return iso.slice(0, 10);
}

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isLockedByDate(unlockDateIso: string | null): boolean {
  if (!unlockDateIso) return false;
  const t = Date.parse(unlockDateIso);
  if (Number.isNaN(t)) return false;
  return Date.now() < t;
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
  const pub = row.session_layout_published_at;
  return {
    id,
    package_id: packageId,
    title: (row.title ?? row.plan_title ?? `Plan ${packageId}`).trim(),
    start_date: (row.start_date ?? "").trim(),
    created_at: (row.created_at ?? "").trim(),
    session_layout_published_at:
      pub == null || String(pub).trim() === "" ? null : String(pub).trim(),
  };
}

function isSessionLayoutDraft(a: Assignment | null): boolean {
  if (!a) return false;
  const t = a.session_layout_published_at;
  return t == null || String(t).trim() === "";
}

type SessionCardItem = {
  id: number;
  title: string;
  category: string;
  image: string;
  status?: "Unlocked" | "Locked" | "Completed";
  showEdit?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
};

const SESSION_IMAGE = sessionFallbackImg;

// (Previously hardcoded plan options lived here; now loaded from Assign Package endpoints.)

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="up-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.232 5.232l3.536 3.536M9 20h3.75L19.5 13.25a2.5 2.5 0 000-3.536l-1.714-1.714a2.5 2.5 0 00-3.536 0L7.5 14.75V18.5A1.5 1.5 0 009 20z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="up-icon-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16M9 7V5.8c0-.995.805-1.8 1.8-1.8h2.4c.995 0 1.8.805 1.8 1.8V7m-8 0l.7 10.1A2 2 0 008.695 19h6.61a2 2 0 001.995-1.9L18 7M10 11v4.5M14 11v4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="up-status-lock"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 10V8a4 4 0 118 0v2m-9 0h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="up-status-lock"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 10V8a4 4 0 117.6-1.6M7 10h10a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1v-7a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SessionCard({ item }: { item: SessionCardItem }) {
  const locked = item.status === "Locked";
  return (
    <article className={`up-session-card${locked ? " up-session-card--locked" : ""}`}>
      <div className="up-session-image-wrap">
        <img className="up-session-image" src={item.image} alt={item.title} />
      </div>

      <div className="up-session-content">
        <h3 className="up-session-title">{item.title}</h3>
        <p className="up-session-category">{item.category}</p>

        <div className="up-session-footer">
          <span className={`up-session-status ${locked ? "is-locked" : "is-unlocked"}`}>
            {locked ? <LockIcon /> : <UnlockIcon />}
            <span>
              {item.status === "Completed" ? "Completed" : locked ? "Locked" : "Unlocked"}
            </span>
          </span>

          <div className="up-session-actions">
            {item.showEdit ? (
              <button
                type="button"
                className="up-icon-btn"
                aria-label="Edit session"
                onClick={item.onEdit}
              >
                <PencilIcon />
              </button>
            ) : null}

            {item.showDelete ? (
              <button
                type="button"
                className="up-icon-btn"
                aria-label="Delete session"
                onClick={item.onDelete}
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function AddSessionCard({
  disabled,
  categories,
  onPickModuleId,
}: {
  disabled?: boolean;
  categories: Array<{
    label: string;
    sessions: Array<{ module_id: number; title: string }>;
  }>;
  onPickModuleId: (moduleId: number) => void;
}) {
  return (
    <div className="up-add-card">
      <div className="up-add-card-inner">
        <div className="up-add-card-fill">
          <div className="up-add-icon">+</div>
        </div>
        <SessionNestedDropdown
          categories={categories}
          disabled={disabled}
          onSessionSelect={onPickModuleId}
        />
      </div>
    </div>
  );
}

type SessionRowProps = {
  title: string;
  weeks: string;
  /** 0 = Restore, 1 = Retrain, 2 = Reclaim — sent when adding a session. */
  phaseIndex: number;
  items?: (SessionCardItem | undefined)[];
  pickerDisabled?: boolean;
  pickerCategories: Array<{
    label: string;
    sessions: Array<{ module_id: number; title: string }>;
  }>;
  onPickSession: (moduleId: number, phaseIndex: number, slotIndex: number) => void;
};

function SessionRow({
  title,
  weeks,
  phaseIndex,
  items = [],
  pickerDisabled,
  pickerCategories,
  onPickSession,
}: SessionRowProps) {
  const slots = 4;
  const padded: (SessionCardItem | undefined)[] = [...items];
  while (padded.length < slots) padded.push(undefined);
  const row = padded.slice(0, slots);
  return (
    <div className="up-session-group">
      <div className="up-session-group-header">
        <h3 className="up-group-title">{title}</h3>
        <p className="up-group-weeks">{weeks}</p>
      </div>

      <div className="up-session-grid">
        {row.map((item, idx) => {
          return item ? (
            <SessionCard key={`${phaseIndex}-${idx}-${item.id}`} item={item} />
          ) : (
            <AddSessionCard
              key={`add-${phaseIndex}-${idx}`}
              disabled={pickerDisabled}
              categories={pickerCategories}
              onPickModuleId={(mid) => onPickSession(mid, phaseIndex, idx)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as ActiveClient | undefined;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null | undefined>(undefined);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  /** Selected plan in the dropdown (`null` = placeholder). */
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Assign Package-backed state (same endpoints, embedded here)
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<AssignPlan[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loadingAssignData, setLoadingAssignData] = useState(false);
  const [startDateDraft, setStartDateDraft] = useState("");
  const [savingStartDate, setSavingStartDate] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [assignedSessions, setAssignedSessions] = useState<AssignmentSessionRow[]>([]);
  const [moduleLibrary, setModuleLibrary] = useState<ModuleLibraryRow[]>([]);
  const [moduleLibraryLoading, setModuleLibraryLoading] = useState(false);
  const [addingModuleId, setAddingModuleId] = useState<number | null>(null);
  const [removeSessionTarget, setRemoveSessionTarget] = useState<{
    moduleId: number;
    title: string;
    url: string;
  } | null>(null);
  const [removingSession, setRemovingSession] = useState(false);
  /** Confirm before first plan or before replacing an existing plan; includes snapshot for conflict detection. */
  const [pendingPlanChange, setPendingPlanChange] = useState<{
    kind: "first" | "replace";
    nextPlanId: number;
    planTitle: string;
    startDateToUse: string;
    replaceSnapshot?: { id: string; created_at: string };
  } | null>(null);
  const [publishSessionLayoutOpen, setPublishSessionLayoutOpen] = useState(false);
  const [publishStartDateField, setPublishStartDateField] = useState("");
  const [publishingLayout, setPublishingLayout] = useState(false);

  const name = useMemo(() => {
    if (!user) return "—";
    return [user.fname, user.lname].filter(Boolean).join(" ") || "—";
  }, [user]);

  useEffect(() => {
    if (!user?.user_id) return;
    setResolvedAvatarUrl(undefined);
    let cancelled = false;
    fetchClientProfileAvatar(user.user_id)
      .then((url) => {
        if (!cancelled) setResolvedAvatarUrl(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  // Refresh the email from the source of truth (public.user via admin-approval edge),
  // so if the user changes their email in the mobile app, admin UI reflects it after load.
  useEffect(() => {
    if (!user?.user_id) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchActiveClients();
        const match = list.find((c) => Number(c.user_id) === Number(user.user_id));
        const email = (match?.email ?? "").trim();
        if (!cancelled) setResolvedEmail(email || null);
      } catch {
        if (!cancelled) setResolvedEmail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  const avatarUrlForDisplay =
    resolvedAvatarUrl !== undefined ? resolvedAvatarUrl : user?.avatar_url;
  const emailForDisplay = resolvedEmail ?? user?.email ?? "";

  const displayedPlanTitle = useMemo(() => {
    if (assignment?.title) return assignment.title;
    const p = plans.find((x) => x.plan_id === selectedPlanId);
    return p?.title ?? "Plan Title";
  }, [assignment, plans, selectedPlanId]);

  const clearFeedback = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const setFeedbackError = (msg: string) => {
    setSuccessMessage(null);
    setError(msg);
  };

  const setFeedbackSuccess = (msg: string) => {
    setError(null);
    setSuccessMessage(msg);
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const reloadAssignPackageData = useCallback(async () => {
    if (!user?.email) return;
    setLoadingAssignData(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [usersRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/api/assign-package/users`, { headers }),
        fetch(`${API_BASE}/api/assign-package/plans`, { headers }),
      ]);
      const usersData = await usersRes.json().catch(() => null);
      const plansData = await plansRes.json().catch(() => null);
      if (!usersRes.ok) {
        throw new Error((usersData as any)?.error || "Failed to load users for assignment.");
      }
      if (!plansRes.ok) {
        throw new Error((plansData as any)?.error || "Failed to load plans.");
      }

      const emailLower = user.email.trim().toLowerCase();
      const usersList: AssignUser[] = Array.isArray(usersData) ? (usersData as AssignUser[]) : [];
      let match = usersList.find((u) => (u.email ?? "").trim().toLowerCase() === emailLower);
      if (!match?.id) {
        const resolveByEmail = await fetch(
          `${API_BASE}/api/assign-package/resolve-client?email=${encodeURIComponent(emailLower)}`,
          { headers },
        );
        if (resolveByEmail.ok) {
          const rj = (await resolveByEmail.json()) as { id?: string };
          if (rj.id) match = { id: rj.id, email: user.email ?? null, full_name: undefined };
        }
      }
      if (!match?.id && user.user_id != null) {
        const resolveByProfile = await fetch(
          `${API_BASE}/api/assign-package/resolve-client?user_id=${encodeURIComponent(String(user.user_id))}`,
          { headers },
        );
        if (resolveByProfile.ok) {
          const rj = (await resolveByProfile.json()) as { id?: string };
          if (rj.id) match = { id: rj.id, email: user.email ?? null, full_name: undefined };
        }
      }
      if (!match?.id) {
        setAssignUserId(null);
        setAssignment(null);
        setSelectedPlanId(null);
        setPlans(Array.isArray(plansData) ? (plansData as AssignPlan[]) : []);
        return;
      }
      setAssignUserId(match.id);
      setPlans(Array.isArray(plansData) ? (plansData as AssignPlan[]) : []);

      const base = `${API_BASE}/api/assign-package/users/${encodeURIComponent(match.id)}`;
      const tryFetch = async (url: string) => {
        const r = await fetch(url, { headers });
        const j = await r.json().catch(() => null);
        return { r, j };
      };
      const primary = await tryFetch(`${base}/assignments`);
      const picked = primary.r.ok ? primary : await tryFetch(`${base}/packages`);
      if (!picked.r.ok) {
        setAssignment(null);
        setSelectedPlanId(null);
        return;
      }
      const rows = Array.isArray(picked.j) ? (picked.j as AssignmentApiRow[]) : [];
      const list = rows.map(normalizeAssignmentRow).filter((x): x is Assignment => x != null);
      const latest = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;
      setAssignment(latest);
      setSelectedPlanId(latest ? latest.package_id : null);
      setStartDateDraft(latest?.start_date ? toDateInputValue(latest.start_date) : "");
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Failed to load assignment data.");
    } finally {
      setLoadingAssignData(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void reloadAssignPackageData();
  }, [reloadAssignPackageData]);

  const applyPlanChange = async (
    nextPlanId: number,
    planTitle: string,
    startDateToUse: string,
    conflict?: { kind: "first" } | { kind: "replace"; snapshot: { id: string; created_at: string } },
  ): Promise<boolean> => {
    if (!assignUserId) return false;
    setSavingPlan(true);
    clearFeedback();
    try {
      const headers = await authHeaders();
      const base = `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}`;
      const tryFetch = async (url: string) => {
        const r = await fetch(url, { headers });
        const j = await r.json().catch(() => null);
        return { r, j };
      };
      const primary = await tryFetch(`${base}/assignments`);
      const picked = primary.r.ok ? primary : await tryFetch(`${base}/packages`);
      if (!picked.r.ok) {
        setFeedbackError((picked.j as any)?.error || "Failed to load assignments.");
        return false;
      }
      const rows = Array.isArray(picked.j) ? (picked.j as AssignmentApiRow[]) : [];
      const list = rows.map(normalizeAssignmentRow).filter((x): x is Assignment => x != null);
      const latest = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;

      if (conflict?.kind === "first") {
        if (list.length > 0) {
          setFeedbackError(
            "A plan was assigned while you were editing. Refresh the page, then try again.",
          );
          return false;
        }
      } else if (conflict?.kind === "replace") {
        const { snapshot } = conflict;
        if (
          !latest ||
          latest.id !== snapshot.id ||
          String(latest.created_at) !== String(snapshot.created_at)
        ) {
          setFeedbackError(
            "This plan was changed by another admin. Refresh the page, then try again.",
          );
          return false;
        }
      }

      for (const a of list) {
        const del = await fetch(
          `${base}/assignments/${encodeURIComponent(a.id)}`,
          { method: "DELETE", headers },
        );
        const body = (await del.json().catch(() => ({}))) as { error?: string };
        if (!del.ok) {
          setFeedbackError(body.error || "Failed to remove previous plan.");
          return false;
        }
      }

      const res = await fetch(`${API_BASE}/api/assign-package/assign-package`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: assignUserId,
          package_id: nextPlanId,
          start_date: startDateToUse,
          defer_session_layout: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedbackError(data.error || "Failed to assign plan.");
        return false;
      }
      markAssignmentCountsStale();
      setStartDateDraft(toDateInputValue(startDateToUse));
      await reloadAssignPackageData();
      setFeedbackSuccess(
        `Plan assigned: ${planTitle}. Click Save to set the start date and publish so the client can see sessions.`,
      );
      return true;
    } catch {
      setFeedbackError("Something went wrong.");
      return false;
    } finally {
      setSavingPlan(false);
    }
  };

  const handlePlanSelect = async (nextPlanIdStr: string) => {
    if (!assignUserId || nextPlanIdStr === "") return;
    const nextPlanId = Number(nextPlanIdStr);
    if (!Number.isFinite(nextPlanId)) return;

    if (assignment?.package_id === nextPlanId) {
      setSelectedPlanId(nextPlanId);
      return;
    }

    const planTitle =
      plans.find((p) => p.plan_id === nextPlanId)?.title?.trim() || "Plan";

    const startDateToUse = todayLocalIsoDate();

    // First plan — confirm before assigning.
    if (!assignment) {
      setPendingPlanChange({
        kind: "first",
        nextPlanId,
        planTitle,
        startDateToUse,
      });
      setSelectedPlanId(null);
      return;
    }

    // Replacing an existing plan — confirm (and capture snapshot for conflict check).
    if (assignment.package_id !== nextPlanId) {
      setPendingPlanChange({
        kind: "replace",
        nextPlanId,
        planTitle,
        startDateToUse,
        replaceSnapshot: { id: assignment.id, created_at: assignment.created_at },
      });
      setSelectedPlanId(assignment.package_id);
    }
  };

  const handleCancelPlanReplace = () => {
    setPendingPlanChange(null);
  };

  const handleConfirmPlanReplace = () => {
    const p = pendingPlanChange;
    if (!p) return;
    void (async () => {
      if (p.kind === "replace" && !p.replaceSnapshot) {
        setFeedbackError("Missing assignment data. Refresh and try again.");
        return;
      }
      const conflict =
        p.kind === "first"
          ? { kind: "first" as const }
          : { kind: "replace" as const, snapshot: p.replaceSnapshot! };
      const ok = await applyPlanChange(p.nextPlanId, p.planTitle, p.startDateToUse, conflict);
      if (ok) setPendingPlanChange(null);
    })();
  };

  useEffect(() => {
    const loadSessions = async () => {
      if (!assignUserId || !assignment?.id) return;
      setSessionsLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/sessions`,
          { headers },
        );
        const body = (await res.json().catch(() => ({}))) as SessionsPayload & { error?: string };
        if (!res.ok) {
          setAssignedSessions([]);
          setFeedbackError(body.error || "Could not load sessions for this plan.");
          return;
        }
        const sessions = Array.isArray(body.sessions) ? body.sessions : [];
        const included = sessions.filter((s) => s.is_unlocked === true);
        setAssignedSessions(sortIncludedAssignmentSessions(included));
        setError(null);
      } catch {
        setFeedbackError("Could not load sessions.");
      } finally {
        setSessionsLoading(false);
      }
    };
    void loadSessions();
  }, [assignUserId, assignment?.id]);

  useEffect(() => {
    const loadModules = async () => {
      setModuleLibraryLoading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/api/assign-package/modules`, { headers });
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
              description: r.description == null ? null : String(r.description),
              session_number: r.session_number == null ? null : Number(r.session_number),
              thumbnail_url: r.thumbnail_url == null ? null : String(r.thumbnail_url),
            }))
            .filter((m: any) => Number.isFinite(m.module_id) && m.title),
        );
      } finally {
        setModuleLibraryLoading(false);
      }
    };
    void loadModules();
  }, []);

  const sessionLayoutIsDraft = isSessionLayoutDraft(assignment);
  const topSaveDisabled =
    savingStartDate ||
    publishingLayout ||
    savingPlan ||
    loadingAssignData ||
    assignUserId == null ||
    assignment == null;

  const refreshSessionsFromApi = async () => {
    if (!assignUserId || !assignment?.id) return;
    const headers = await authHeaders();
    const r = await fetch(
      `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/sessions`,
      { headers },
    );
    const b = (await r.json().catch(() => ({}))) as SessionsPayload;
    const sessions = Array.isArray(b.sessions) ? b.sessions : [];
    const included = sessions.filter((s: any) => s.is_unlocked === true);
    setAssignedSessions(sortIncludedAssignmentSessions(included));
  };

  const handleTopSave = () => {
    if (!assignUserId || !assignment?.id) return;
    setPublishStartDateField(
      (startDateDraft && startDateDraft.trim()) ||
        (assignment.start_date ? toDateInputValue(assignment.start_date) : "") ||
        todayLocalIsoDate(),
    );
    setPublishSessionLayoutOpen(true);
  };

  const handleConfirmPublishSessionLayout = async () => {
    if (!assignUserId || !assignment?.id) return;
    const d = publishStartDateField.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setFeedbackError("Choose a valid start date.");
      return;
    }
    clearFeedback();
    const draft = isSessionLayoutDraft(assignment);
    if (!draft) {
      if (toDateInputValue(assignment.start_date) === d) {
        setPublishSessionLayoutOpen(false);
        setFeedbackSuccess("Start date unchanged.");
        return;
      }
      setSavingStartDate(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(
          `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ start_date: d }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setFeedbackError(body.error || "Failed to update start date.");
          return;
        }
        setPublishSessionLayoutOpen(false);
        setStartDateDraft(toDateInputValue(d));
        setAssignment((prev) => (prev ? { ...prev, start_date: d } : prev));
        await refreshSessionsFromApi();
        setFeedbackSuccess("Start date updated.");
      } catch {
        setFeedbackError("Something went wrong.");
      } finally {
        setSavingStartDate(false);
      }
      return;
    }

    setPublishingLayout(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/publish-session-layout`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ start_date: d }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedbackError(body.error || "Failed to publish.");
        return;
      }
      setPublishSessionLayoutOpen(false);
      setStartDateDraft(toDateInputValue(d));
      await reloadAssignPackageData();
      setFeedbackSuccess(
        "Plan published. Session order and start date are live for the client; the first session will unlock per your schedule.",
      );
    } catch {
      setFeedbackError("Something went wrong.");
    } finally {
      setPublishingLayout(false);
    }
  };

  const mapSessionToCard = useCallback(
    (s: AssignmentSessionRow, phaseIndex: number, slot: number): SessionCardItem => {
      const draftLayout = isSessionLayoutDraft(assignment);
      const patientCompleted = s.patient_is_completed === true;
      const patientUnlocked = s.patient_is_unlocked === true;
      const locked = draftLayout ? true : !patientUnlocked;
      const canEdit = locked;
      return {
        id: s.module_id + phaseIndex * 1_000 + slot * 10_000,
        title: s.title || "Session",
        category: (s.description ?? "").trim() || "Session",
        image: (s.thumbnail_url ?? "").trim() || SESSION_IMAGE,
        status: patientCompleted ? "Completed" : locked ? "Locked" : "Unlocked",
        showEdit: canEdit,
        showDelete: true,
        onDelete: () =>
          setRemoveSessionTarget({
            moduleId: s.module_id,
            title: s.title || "Session",
            url:
              s.kind === "added" && s.user_assignment_session_id
                ? `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId ?? "")}/assignments/${encodeURIComponent(assignment?.id ?? "")}/sessions/added/${encodeURIComponent(s.user_assignment_session_id)}`
                : `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId ?? "")}/assignments/${encodeURIComponent(assignment?.id ?? "")}/sessions/${encodeURIComponent(String(s.module_id))}`,
          }),
        onEdit: () => {
          if (!canEdit || !assignUserId || !assignment?.id || !user) return;
          navigate(
            `/users/${encodeURIComponent(assignUserId)}/assignment/${encodeURIComponent(assignment.id)}/session/${encodeURIComponent(String(s.module_id))}`,
            { state: { userProfileClient: user } },
          );
        },
      };
    },
    [assignUserId, assignment, navigate, user],
  );

  const buildPhaseRowItems = useCallback(
    (phaseIndex: number): (SessionCardItem | undefined)[] => {
      const useGrid = assignedSessions.some(
        (x) =>
          x.phase_title != null ||
          (x.phase_index != null && x.slot_index != null),
      );
      if (!useGrid && assignedSessions.length > 0) {
        const start = phaseIndex * 4;
        const slice = assignedSessions.slice(start, start + 4);
        return [0, 1, 2, 3].map((i) =>
          slice[i] ? mapSessionToCard(slice[i], phaseIndex, i) : undefined,
        );
      }
      return [0, 1, 2, 3].map((slot) => {
        const s = assignedSessions.find(
          (x) => x.phase_index === phaseIndex && x.slot_index === slot,
        );
        return s ? mapSessionToCard(s, phaseIndex, slot) : undefined;
      });
    },
    [assignedSessions, mapSessionToCard],
  );

  const restoreItems = useMemo(() => buildPhaseRowItems(0), [buildPhaseRowItems]);

  const pickerCategories = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ module_id: number; title: string; session_number: number | null }>
    >();
    for (const m of moduleLibrary) {
      const label = (m.description ?? "Uncategorized").trim() || "Uncategorized";
      const arr = groups.get(label) ?? [];
      arr.push({
        module_id: m.module_id,
        title: m.title,
        session_number: m.session_number,
      });
      groups.set(label, arr);
    }
    const out = Array.from(groups.entries())
      .map(([label, sessions]) => ({
        label,
        sessions: sessions
          .slice()
          .sort((a, b) => (a.session_number ?? 999999) - (b.session_number ?? 999999) || a.title.localeCompare(b.title))
          .map((s) => ({
            module_id: s.module_id,
            title: s.title,
          })),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [moduleLibrary]);

  const handlePickSession = async (
    moduleId: number,
    phaseIndex: number,
    slotIndex: number,
  ) => {
    if (!assignUserId || !assignment?.id) return;
    const pickedTitle =
      moduleLibrary.find((m) => m.module_id === moduleId)?.title?.trim() || "Session";
    clearFeedback();
    setAddingModuleId(moduleId);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/sessions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            module_id: moduleId,
            phase_index: phaseIndex,
            slot_index: slotIndex,
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedbackError(body.error || "Failed to add session.");
        return;
      }
      const headers2 = await authHeaders();
      const r = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/sessions`,
        { headers: headers2 },
      );
      const b = (await r.json().catch(() => ({}))) as SessionsPayload;
      const sessions = Array.isArray((b as any).sessions) ? (b as any).sessions : [];
      const included = sessions.filter((s: any) => s.is_unlocked === true);
      setAssignedSessions(sortIncludedAssignmentSessions(included));
      setFeedbackSuccess(`Session added: ${pickedTitle}.`);
    } catch {
      setFeedbackError("Something went wrong.");
    } finally {
      setAddingModuleId(null);
    }
  };

  const refreshAssignedSessions = async () => {
    if (!assignUserId || !assignment?.id) return;
    setSessionsLoading(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(
        `${API_BASE}/api/assign-package/users/${encodeURIComponent(assignUserId)}/assignments/${encodeURIComponent(assignment.id)}/sessions`,
        { headers },
      );
      const b = (await r.json().catch(() => ({}))) as SessionsPayload;
      const sessions = Array.isArray(b.sessions) ? b.sessions : [];
      const included = sessions.filter((s: any) => s.is_unlocked === true);
      setAssignedSessions(sortIncludedAssignmentSessions(included));
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleConfirmRemoveSession = async () => {
    if (!assignUserId || !assignment?.id || !removeSessionTarget) return;
    const removedTitle = removeSessionTarget.title?.trim() || "Session";
    clearFeedback();
    setRemovingSession(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(removeSessionTarget.url, { method: "DELETE", headers });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFeedbackError(body.error || "Failed to remove session.");
        return;
      }
      setRemoveSessionTarget(null);
      await refreshAssignedSessions();
      setFeedbackSuccess(`Session removed: ${removedTitle}.`);
    } catch {
      setFeedbackError("Something went wrong.");
    } finally {
      setRemovingSession(false);
    }
  };

  const retrainItems = useMemo(() => buildPhaseRowItems(1), [buildPhaseRowItems]);

  const reclaimItems = useMemo(() => buildPhaseRowItems(2), [buildPhaseRowItems]);

  const handleBack = () => {
    navigate("/users");
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
    clearFeedback();
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!user) return;

    setBusy(true);
    clearFeedback();

    try {
      await deleteClient(DEFAULT_ADMIN_ID, user.user_id);
      setShowConfirm(false);
      navigate("/users", { state: { refreshUsers: true, deleteSuccess: true } });
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to delete client");
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="up-page">
          <div className="up-shell">
            <div className="up-empty-state">
              <div>
                <h1 className="up-page-title">Edit User</h1>
                <p className="up-page-subtitle">No user selected</p>
              </div>

              <button className="up-btn up-btn-back" type="button" onClick={handleBack}>
                Back
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="up-page">
        <div className="up-shell">
          <header className="up-topbar">
            <div>
              <h1 className="up-page-title">Edit User</h1>
              <p className="up-page-subtitle">{name}</p>
            </div>

            <div className="up-topbar-actions">
              <button
                className="up-btn up-btn-delete"
                type="button"
                onClick={handleDeleteClick}
                disabled={busy}
              >
                {busy ? "Deleting..." : "Delete"}
              </button>

              <button className="up-btn up-btn-back" type="button" onClick={handleBack}>
                Back
              </button>

              <button
                className="up-btn up-btn-save"
                type="button"
                onClick={() => void handleTopSave()}
                disabled={topSaveDisabled}
              >
                {publishingLayout ? "Publishing…" : savingStartDate ? "Saving…" : "Save"}
              </button>
            </div>
          </header>

          <div className="up-feedback" aria-live="polite">
            {error ? (
              <p className="up-inline-error" role="alert">
                {error}
              </p>
            ) : null}
            {!error && successMessage ? (
              <p className="up-inline-success" role="status">
                {successMessage}
              </p>
            ) : null}
          </div>

          <section className="up-profile-row">
            <div className="up-avatar-column">
              <div className="up-avatar-frame">
                <UserAvatar name={name} url={avatarUrlForDisplay ?? undefined} />
              </div>
            </div>

            <form className="up-form-grid" onSubmit={(e) => e.preventDefault()}>
              <label className="up-field">
                <span className="up-label">Name</span>
                <input className="up-input" value={name} readOnly />
              </label>

              <label className="up-field">
                <span className="up-label">Email</span>
                <input className="up-input" value={emailForDisplay} readOnly />
              </label>
            </form>
          </section>

          <hr className="up-divider" />

          <section className="up-plan-section">
            <div className="up-plan-header">
              <h2 className="up-plan-title">{displayedPlanTitle}</h2>

              <div className="up-plan-select-wrap">
                <div className="up-plan-controls">
                  <PlanSelectDropdown
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    disabled={
                      loadingAssignData ||
                      savingStartDate ||
                      savingPlan ||
                      publishingLayout ||
                      assignUserId == null ||
                      pendingPlanChange != null
                    }
                    onSelect={(id) => void handlePlanSelect(id)}
                  />
                </div>
              </div>
            </div>

            {assignment != null && sessionLayoutIsDraft ? (
              <p className="up-inline-hint up-plan-draft-hint" role="status">
                Draft: sessions stay locked here until you click Save and confirm the start date; the
                client does not see this plan or unlocks until then.
              </p>
            ) : null}

            {assignUserId == null && !loadingAssignData ? (
              <p className="up-inline-hint">
                This user is not available for assignment (missing profile/email match).
              </p>
            ) : null}

            {sessionsLoading ? <p className="up-inline-hint">Loading sessions…</p> : null}
            {savingPlan ? <p className="up-inline-hint">Saving plan…</p> : null}
            <SessionRow
              title="Restore"
              weeks="Weeks 1 - 4"
              phaseIndex={0}
              items={restoreItems}
              pickerDisabled={
                moduleLibraryLoading ||
                sessionsLoading ||
                savingPlan ||
                publishingLayout ||
                assignUserId == null ||
                assignment == null ||
                addingModuleId != null
              }
              pickerCategories={pickerCategories}
              onPickSession={(mid, ph, sl) => void handlePickSession(mid, ph, sl)}
            />
            <SessionRow
              title="Retrain"
              weeks="Weeks 5 - 8"
              phaseIndex={1}
              items={retrainItems}
              pickerDisabled={
                moduleLibraryLoading ||
                sessionsLoading ||
                savingPlan ||
                publishingLayout ||
                assignUserId == null ||
                assignment == null ||
                addingModuleId != null
              }
              pickerCategories={pickerCategories}
              onPickSession={(mid, ph, sl) => void handlePickSession(mid, ph, sl)}
            />
            <SessionRow
              title="Reclaim"
              weeks="Weeks 9 - 12"
              phaseIndex={2}
              items={reclaimItems}
              pickerDisabled={
                moduleLibraryLoading ||
                sessionsLoading ||
                savingPlan ||
                publishingLayout ||
                assignUserId == null ||
                assignment == null ||
                addingModuleId != null
              }
              pickerCategories={pickerCategories}
              onPickSession={(mid, ph, sl) => void handlePickSession(mid, ph, sl)}
            />
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Remove Client"
        message="Are you sure you want to delete this client?"
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onCancel={handleConfirmCancel}
        onConfirm={() => void handleConfirmDelete()}
      />

      <ConfirmDialog
        open={pendingPlanChange != null}
        title={
          pendingPlanChange?.kind === "first"
            ? "Assign plan to this user?"
            : "Remove plan from user dashboard?"
        }
        message={
          pendingPlanChange?.kind === "first"
            ? `Session order is as below. Assign "${pendingPlanChange.planTitle}" to ${name}?`
            : `You are about to remove the current plan from ${name}'s dashboard and add "${pendingPlanChange?.planTitle ?? ""}" instead.`
        }
        confirmLabel={pendingPlanChange?.kind === "first" ? "Assign" : "Confirm"}
        cancelLabel="Cancel"
        variant="primary"
        busy={savingPlan}
        onCancel={handleCancelPlanReplace}
        onConfirm={handleConfirmPlanReplace}
      />

      <ConfirmDialog
        open={removeSessionTarget != null}
        title="Remove Session"
        message="Are you sure you want to delete this session?"
        confirmLabel="Delete"
        variant="danger"
        busy={removingSession}
        onCancel={() => setRemoveSessionTarget(null)}
        onConfirm={() => void handleConfirmRemoveSession()}
      />

      <ConfirmDialog
        open={publishSessionLayoutOpen}
        title={sessionLayoutIsDraft ? "Assign a plan start date" : "Plan start date"}
        message={
          sessionLayoutIsDraft
            ? "Session order is as below. Choose a plan start date, then confirm to assign."
            : "Update when this plan starts for the user. Confirm saves the new start date (session order is unchanged)."
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="primary"
        busy={publishingLayout || savingStartDate}
        onCancel={() => setPublishSessionLayoutOpen(false)}
        onConfirm={() => void handleConfirmPublishSessionLayout()}
      >
        <div className="confirm-dialog-field">
          <span className="confirm-dialog-field-label" id="up-publish-start-label">
            Plan start date
          </span>
          <input
            id="up-publish-start-date"
            type="date"
            className="confirm-dialog-date-input"
            value={publishStartDateField}
            onChange={(e) => setPublishStartDateField(e.target.value)}
            disabled={publishingLayout}
            aria-labelledby="up-publish-start-label"
          />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
