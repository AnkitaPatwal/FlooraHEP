import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-client";
import "../components/ResetPassword.css";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || "Failed to reset password.");
    } else {
      setSuccess("Password updated! Redirecting to login...");
      setTimeout(() => navigate("/admin-login", { replace: true }), 1500);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-box">
        <button
          className="reset-back-btn"
          onClick={() => navigate("/admin-login")}
          aria-label="Back"
        >
          ←
        </button>
        <h2>Reset password</h2>
        <p>Enter your new password below.</p>
        <form className="reset-form" onSubmit={handleSubmit}>
          <label>New Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <label>Confirm Password</label>
          <input
            className="reset-input"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {error && <div className="reset-alert error">{error}</div>}
          {success && <div className="reset-alert success">{success}</div>}
          <button className="reset-btn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;