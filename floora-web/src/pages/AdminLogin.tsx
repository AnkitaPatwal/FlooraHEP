import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocked(false);
    setLoading(true);

    // DEMO: fail unless exact admin creds
    await new Promise(r => setTimeout(r, 250));
    const ok = email === "admin@floora.com" && password === "admin123";
    if (ok) {
      window.location.href = "/admin-dashboard"; // or your next page
    } else {
      setLocked(true); // <-- admin-only locked banner appears
    }
    setLoading(false);
  }

  function unlock() {
    setLocked(false);
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="logo">Floora</h1>
        <p className="admin-subtitle">Admin Portal</p> {/* different subtitle */}

        <input
          type="email"
          placeholder="Admin Email"            // different placeholder
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Admin Password"         // different placeholder
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* admin-only locked-session banner */}
        {locked && (
          <div className="error-banner" role="alert" aria-live="assertive">
            Session locked — unlock this session to continue.
            <button type="button" className="unlock-btn" onClick={unlock}>
              Unlock
            </button>
          </div>
        )}

        <a href="#" className="forgot">Forgot Password?</a>

        <button className="signin" disabled={loading}>
          {loading ? "Signing in…" : "Admin Sign In"}   {/* different button text */}
        </button>

        <p className="create-account">
          Not an admin? <Link to="/">Go to Client Login</Link>
        </p>
      </form>
    </div>
  );
}
