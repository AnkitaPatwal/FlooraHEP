import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import { approveClient, denyClient, type PendingClient } from "../lib/admin-api";
import "../components/UserApproval.css";

const DEFAULT_ADMIN_ID = 1;

export default function UserApproval() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as PendingClient | undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    navigate("/users");
  };
  // Handles the approve action
  const handleApprove = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await approveClient(DEFAULT_ADMIN_ID, user.user_id);
      navigate("/users", { state: { refreshUsers: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
      setBusy(false);
    }
  };

  // Handles the deny action
  const handleDeny = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await denyClient(DEFAULT_ADMIN_ID, user.user_id);
      navigate("/users", { state: { refreshUsers: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny");
      setBusy(false);
    }
  };

  // If no user is selected, show a message to go back and click a pending user
  if (!user) {
    return (
      <AppLayout>
        <div className="ua-page">
          <div className="ua-panel">
            <header className="ua-header">
              <h1 className="ua-title">Edit User</h1>
              <button className="ua-back-btn" type="button" onClick={handleBack}>
                Back
              </button>
            </header>
            <p className="ua-empty">No user selected. Go back and click a pending user.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If a user is selected, show the user's name and email
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
              <h1 className="ua-title">Edit User</h1>
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
                  className="ua-approve"
                  type="button"
                  disabled={busy}
                  onClick={handleApprove}
                >
                  {busy ? "…" : "Approve"}
                </button>
                <button
                  className="ua-deny"
                  type="button"
                  disabled={busy}
                  onClick={handleDeny}
                >
                  Deny
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
    </AppLayout>
  );
}
