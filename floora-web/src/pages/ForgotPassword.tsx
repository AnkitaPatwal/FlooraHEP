import React, { useState, useEffect } from "react";
import "../components/ForgotPassword.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const callForgotPasswordEdge = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Application configuration is incomplete. Missing Supabase URL or anon key."
      );
    }
    const base = supabaseUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/functions/v1/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        client: "web",
        ...(typeof window !== "undefined"
          ? { reset_web_base: `${window.location.origin}/reset-password` }
          : {}),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      throw new Error(data.message || "Could not send reset email. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      await callForgotPasswordEdge();
      setSuccess(
        "If an account exists for this email, we sent a reset link. Check your inbox."
      );
      setCooldown(30);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown === 0) void handleSubmit(new Event("submit") as unknown as React.FormEvent);
  };

  return (
    <div className="forgot-container">
      <div className="forgot-box">
        <h2>Forgot password</h2>
        <p>Please enter your email to reset your password</p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Reset Password"}
          </button>
        </form>
        {success && (
          <div className="resend">
            <p>Haven't got the email yet?</p>
            <button
              className="resend-link"
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
