import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layouts/AppLayout";
import type { PendingClient } from "../lib/admin-api";
import "../components/UserApproval.css";

export default function UserApproval() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user as PendingClient | undefined;

  const handleBack = () => {
    navigate("/users");
  };

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
                <button className="ua-approve" type="button">
                  Approve
                </button>
                <button className="ua-deny" type="button">
                  Deny
                </button>
              </div>
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
