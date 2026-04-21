import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../components/ResetPassword.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => {
    const q = searchParams.get("token")?.trim();
    if (q) return q;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const m = /[?&]token=([^&]+)/.exec(hash);
    return m ? decodeURIComponent(m[1]) : "";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is invalid or expired. Request a new link from the login page.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Application configuration is incomplete. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const base = supabaseUrl.replace(/\/$/, "");
      const res = await fetch(`${base}/functions/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        const msg = data.message || data.error || "Failed to reset password.";
        throw new Error(msg);
      }
      setSuccess("Password updated! Redirecting to login…");
      setTimeout(() => navigate("/admin-login", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-box">
        <button
          className="reset-back-btn"
          type="button"
          onClick={() => navigate("/admin-login")}
          aria-label="Back"
        >
          ←
        </button>
        <h2>Reset password</h2>
        <p>Enter your new password below.</p>
        {!token && (
          <div className="reset-alert error" role="alert">
            This reset link is invalid or expired. Use Forgot password on the login page to get a
            new link.
          </div>
        )}
        <form className="reset-form" onSubmit={handleSubmit}>
          <label>New Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={!token}
          />
          <label>Confirm Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={!token}
          />
          {error && (
            <div className="reset-alert error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="reset-alert success" role="status">
              {success}
            </div>
          )}
          <button className="reset-btn" type="submit" disabled={loading || !token}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
