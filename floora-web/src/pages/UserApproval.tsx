import { useNavigate } from "react-router-dom";     // ⬅️ added
import AppLayout from "../components/layouts/AppLayout";
import "../components/UserApproval.css";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

const USER: User = {
  id: "u1",
  name: "Loretta Barry",
  email: "loretta@floora.pt.com",
  avatarUrl: "https://i.pravatar.cc/180?img=47",
};

export default function UserApproval() {
  const navigate = useNavigate();                   // ⬅️ added

  const handleBack = () => {                        // ⬅️ added
    navigate("/users");
  };

  return (
    <AppLayout>
      <div className="ua-page">
        <div className="ua-panel">
          {/* Header */}
          <header className="ua-header">
            <div>
              <h1 className="ua-title">Edit User</h1>
              <p className="ua-subtitle">Lorem</p>
            </div>
            <button className="ua-back-btn" type="button" onClick={handleBack}>Back</button> {/* ⬅️ added onClick */}
          </header>

          {/* Content */}
          <div className="ua-body">
            {/* Left rail: avatar + actions */}
            <aside className="ua-left">
              <div className="ua-avatar-wrap">
                {USER.avatarUrl ? (
                  <img src={USER.avatarUrl} alt={USER.name} className="ua-avatar" />
                ) : (
                  <div className="ua-avatar ua-avatar-fallback">
                    {USER.name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="ua-actions">
                <button className="ua-approve" type="button">Approve</button>
                <button className="ua-deny" type="button">Deny</button>
              </div>
            </aside>

            {/* Right column: read-only fields */}
            <form className="ua-form" onSubmit={(e) => e.preventDefault()}>
              <label className="ua-field">
                <span className="ua-label">Name</span>
                <input className="ua-input" value={USER.name} disabled />
              </label>

              <label className="ua-field">
                <span className="ua-label">Email</span>
                <input className="ua-input" value={USER.email} disabled />
              </label>

              <label className="ua-field">
                <span className="ua-label">Password</span>
                <input
                  className="ua-input"
                  type="password"
                  value="••••••••••"
                  disabled
                />
              </label>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
