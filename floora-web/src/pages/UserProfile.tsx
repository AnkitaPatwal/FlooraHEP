import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import { deleteClient, type ActiveClient } from "../lib/admin-api";
import "../components/UserApproval.css";

const DEFAULT_ADMIN_ID = 1;

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as ActiveClient | undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
        <div className="ua-page">
          <div className="ua-panel">
            <header className="ua-header">
              <h1 className="ua-title">User Profile</h1>
              <button className="ua-back-btn" type="button" onClick={handleBack}>
                Back
              </button>
            </header>
            <p className="ua-empty">No user selected. Go back and click an active user.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const name = [user.fname, user.lname].filter(Boolean).join(" ") || "—";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout>
      <div className="ua-page">
        <div className="ua-panel">
          <header className="ua-header">
            <div>
              <h1 className="ua-title">User Profile</h1>
              <p className="ua-subtitle">{name}</p>
            </div>
            <button className="ua-back-btn" type="button" onClick={handleBack}>
              Back
            </button>
          </header>

          <div className="ua-body">
            <aside className="ua-left">
              <div className="ua-avatar-wrap">
                <div className="ua-avatar ua-avatar-fallback">{initials}</div>
              </div>

              <div className="ua-actions">
                <button
                  className="ua-deny ua-delete-btn"
                  type="button"
                  disabled={busy}
                  onClick={handleDeleteClick}
                >
                  {busy ? "…" : "Delete"}
                </button>
              </div>
              {error && (
                <p className="ua-error" role="alert">
                  {error}
                </p>
              )}
            </aside>

            <form className="ua-form" onSubmit={(e) => e.preventDefault()}>
              <label className="ua-field">
                <span className="ua-label">Name</span>
                <input className="ua-input" value={name} disabled />
              </label>

              <label className="ua-field">
                <span className="ua-label">Email</span>
                <input className="ua-input" value={user.email} disabled />
              </label>
            </form>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="ua-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ua-modal-title">
          <div className="ua-modal">
            <h2 id="ua-modal-title" className="ua-modal-title">
              Are you sure you want to delete this client?
            </h2>
            <p className="ua-modal-text">
              This will remove the user from the system and they will no longer be able to sign in.
            </p>
            <div className="ua-modal-actions">
              <button
                type="button"
                className="ua-back-btn ua-modal-cancel"
                onClick={handleConfirmCancel}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-delete-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={busy}
              >
                {busy ? "…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
