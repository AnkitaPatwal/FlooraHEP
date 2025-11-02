import React, { useState, useEffect } from "react";
import "../components/ForgotPassword.css";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    // simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess("A reset email has been sent to your email");
      setCooldown(30);
    }, 1000);
  };

  const handleResend = () => {
    if (cooldown === 0) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent);
    }
  };

  return (
    <div className="forgot-container">
        
        {/*
        <button className="back-btn" onClick={() => navigate(-1)}>
            ←
        </button> 
        */}

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
            <p>Haven’t got the email yet?</p>
            <button
              className="resend-link"
              onClick={handleResend}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend email"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
