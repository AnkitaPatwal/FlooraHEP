import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { deleteClient, type PendingClient } from "../lib/admin-api";
import "../components/UserApproval.css";

const DEFAULT_ADMIN_ID = 1;

export default function DeniedUserDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as PendingClient | undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleBack = () => {
    navigate("/users");
  };

  const handleDeleteClick = () => {
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await deleteClient(DEFAULT_ADMIN_ID, user.user_id);
      setConfirmOpen(false);
      navigate("/users", { state: { refreshUsers: true, deleteSuccess: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="ua-page">
          <div className="ua-panel">
            <header className="ua-header">
              <h1 className="ua-title">Denied user</h1>
              <button className="ua-back-btn" type="button" onClick={handleBack}>
                Back
              </button>
            </header>
            <p className="ua-empty">No user selected. Go back and click a denied user.</p>
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
              <h1 className="ua-title">Denied user</h1>
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
                  {busy ? "…" : "Delete user"}
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

              <p className="ua-denied-note">
                This user was denied access. Deleting removes their account from the database and
                they will no longer appear here.
              </p>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this user?"
        message={`Permanently remove ${name} and their login? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  );
}
