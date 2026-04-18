import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase }  from "../lib/supabase-client";
import "../App.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      let pwd = password;
      let { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pwd,
      });

      if (
        error &&
        (error as { code?: string }).code === "invalid_credentials" &&
        pwd.trim() !== pwd
      ) {
        pwd = pwd.trim();
        ({ error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pwd,
        }));
      }

      if (error) {
        if (
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("credentials")
        ) {
          setLoginError("Incorrect email or password.");
        } else {
          setLoginError(error.message || "Login failed. Please try again.");
        }
        return;
      }

      await refreshAuth();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setLoginError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
}