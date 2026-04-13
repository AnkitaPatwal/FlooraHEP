import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import { deleteClient, type ActiveClient } from "../lib/admin-api";
import "../components/UserProfile.css";

const DEFAULT_ADMIN_ID = 1;

function ProfileAvatar({ name, url }: { name: string; url?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name]
  );

  const trimmedUrl = url?.trim() ?? "";
  const showImg = Boolean(trimmedUrl) && !imgFailed;

  return (
    <div className="ua-avatar-wrap">
      {showImg ? (
        <img
          className="ua-avatar"
          src={trimmedUrl}
          alt=""
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="ua-avatar ua-avatar-fallback">{initials}</div>
      )}
    </div>
  );
}

type SessionCardItem = {
  id: number;
  title: string;
  category: string;
  image: string;
  status?: "Unlocked" | "Locked";
  showEdit?: boolean;
  showDelete?: boolean;
};

const SESSION_IMAGE =
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80";

const EXISTING_SESSION: SessionCardItem = {
  id: 1,
  title: "Session Title",
  category: "Category",
  image: SESSION_IMAGE,
  status: "Locked",
  showEdit: true,
  showDelete: true,
};

const PLAN_OPTIONS = [
  "Select a Plan",
  "Leakage",
  "Prenatal",
  "DRA",
  "Low Back Pain",
  "Prolapse",
];

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

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="up-select-chevron"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SessionCard({ item }: { item: SessionCardItem }) {
  return (
    <article className="up-session-card">
      <div className="up-session-image-wrap">
        <img className="up-session-image" src={item.image} alt={item.title} />
      </div>

      <div className="up-session-content">
        <h3 className="up-session-title">{item.title}</h3>
        <p className="up-session-category">{item.category}</p>

        <div className="up-session-footer">
          <span className="up-session-status is-locked">
            <LockIcon />
            <span>{item.status ?? "Locked"}</span>
          </span>

          <div className="up-session-actions">
            {item.showEdit ? (
              <button type="button" className="up-icon-btn" aria-label="Edit session">
                <PencilIcon />
              </button>
            ) : null}

            {item.showDelete ? (
              <button type="button" className="up-icon-btn" aria-label="Delete session">
                <TrashIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function AddSessionCard() {
  return (
    <div className="up-add-card">
      <div className="up-add-icon">+</div>
      <button type="button" className="up-add-btn">
        Select a Session
        <span className="up-add-chevron">▾</span>
      </button>
    </div>
  );
}

type SessionRowProps = {
  title: string;
  weeks: string;
  showFirstRealCard?: boolean;
};

function SessionRow({ title, weeks, showFirstRealCard = false }: SessionRowProps) {
  return (
    <div className="up-session-group">
      <div className="up-session-group-header">
        <h3 className="up-group-title">{title}</h3>
        <span className="up-group-weeks">{weeks}</span>
      </div>

      <div className="up-session-grid">
        {showFirstRealCard ? <SessionCard item={EXISTING_SESSION} /> : <AddSessionCard />}
        <AddSessionCard />
        <AddSessionCard />
        <AddSessionCard />
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Select a Plan");

  const name = useMemo(() => {
    if (!user) return "—";
    return [user.fname, user.lname].filter(Boolean).join(" ") || "—";
  }, [user]);

  const displayedPlanTitle =
    selectedPlan === "Select a Plan" ? "Plan Title" : selectedPlan;

  const handleBack = () => {
    navigate("/users");
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
    setError(null);
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!user) return;

    setBusy(true);
    setError(null);

    try {
      await deleteClient(DEFAULT_ADMIN_ID, user.user_id);
      setShowConfirm(false);
      navigate("/users", { state: { refreshUsers: true, deleteSuccess: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
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

              <button className="up-btn up-btn-save" type="button">
                Save
              </button>
            </div>
          </header>

          {error ? (
            <p className="up-inline-error" role="alert">
              {error}
            </p>
          ) : null}

          <section className="up-profile-row">
            <div className="up-avatar-column">
              <ProfileAvatar name={name} url={user.avatar_url} />
            </div>

            <form className="up-form-grid" onSubmit={(e) => e.preventDefault()}>
              <label className="up-field">
                <span className="up-label">Name</span>
                <input className="up-input" value={name} readOnly />
              </label>

              <label className="up-field">
                <span className="up-label">Email</span>
                <input className="up-input" value={user.email ?? ""} readOnly />
              </label>

              <div className="ua-field ua-field-plans">
                <span className="ua-label">
                  Assigned plans
                  {user.plans?.length ? ` (${user.plans.length})` : ""}
                </span>
                {user.plans?.length ? (
                  <ul className="ua-plans-list">
                    {user.plans.map((p) => (
                      <li key={p.plan_id}>{p.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="ua-plans-empty">No plans assigned</p>
                )}
              </div>
            </form>
          </section>

          <hr className="up-divider" />

          <section className="up-plan-section">
            <div className="up-plan-header">
              <h2 className="up-plan-title">{displayedPlanTitle}</h2>

              <div className="up-plan-select-wrap">
                <div className="up-select-shell">
                  <select
                    className="up-plan-select"
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            <SessionRow title="Restore" weeks="Weeks 1 - 4" showFirstRealCard />
            <SessionRow title="Retrain" weeks="Weeks 5 - 8" />
            <SessionRow title="Reclaim" weeks="Weeks 9 - 12" />
          </section>

          {showConfirm ? (
            <div
              className="up-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="up-modal-title"
            >
              <div className="up-modal">
                <h2 id="up-modal-title" className="up-modal-title">
                  Are you sure you want to delete this client?
                </h2>

                <p className="up-modal-text">
                  This will remove the user from the system and they will no longer be able to sign in.
                </p>

                <div className="up-modal-actions">
                  <button
                    type="button"
                    className="up-btn up-btn-back"
                    onClick={handleConfirmCancel}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="up-btn up-btn-delete-solid"
                    onClick={handleConfirmDelete}
                    disabled={busy}
                  >
                    {busy ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
