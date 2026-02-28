import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocked(false);
    setLoading(true);
    setLoginError(null);

    await new Promise((r) => setTimeout(r, 250));

    try {
      // Call your backend (JWT-based auth)
      const res = await fetch("http://localhost:3000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // do NOT log password; just send it in request body
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      // Backend returns 400/401 with a JSON { message }
      if (!res.ok) {
        let message = "Login failed. Please try again.";
        try {
          const data = await res.json();
          if (data?.message && typeof data.message === "string") {
            message = data.message;
          }
        } catch {
          // ignore JSON parse errors
        }

        if (res.status === 401) {
          setLoginError("Incorrect email or password.");
        } else if (res.status === 400) {
          setLoginError(message);
        } else {
          setLoginError(message);
        }
        return;
      }

      const data: { ok?: boolean; admin?: { id: string; email: string } } =
        await res.json();

      if (!data?.ok) {
        setLoginError("Login failed. Please try again.");
        return;
      }

      // optional: store admin info for this session
      (window as any).__adminUser = data.admin;

      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  function unlock() {
    setLocked(false);
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="logo">Floora</h1>
        <p className="admin-subtitle">Admin Portal</p>

        {loginError && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {loginError}
          </div>
        )}

        <input
          type="email"
          placeholder="Admin Email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Admin Password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {locked && false && (
          <div className="error-banner" role="alert" aria-live="assertive">
            Session locked — unlock this session to continue.
            <button type="button" className="unlock-btn" onClick={unlock}>
              Unlock
            </button>
          </div>
        )}

        <a href="#" className="forgot">
          Forgot Password?
        </a>

        <button type="submit" className="signin" disabled={loading}>
          {loading ? "Signing in…" : "Admin Sign In"}
        </button>

        <p className="create-account">
          New Admin Account?{" "}
          <Link to="/admin-register" className="link">
            Register here
          </Link>
        </p>
        
      </form>
    </div>
  );

