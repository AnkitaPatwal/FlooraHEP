import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { supabase } from "../lib/supabase-client";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocked(false);
    setLoading(true);
    setLoginError(null);

    // DEMO: fail unless exact admin creds
    await new Promise(r => setTimeout(r, 250));

    try{
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setLoginError(toFriendlyLoginMessage(error.message));
        return;
      }

      // success — redirect is acceptable for now
      // (admin role check comes later in ATH-372)
      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }

    /*
    //const ok = email === "admin@floora.com" && password === "admin123";
    const ok = true; //hardcoding for testing purposes
    if (ok) {
      navigate("/dashboard", { replace: true }); // GO TO DASHBOARD
    } else {
      setLocked(true); // <-- admin-only locked banner appears
    }
    setLoading(false);*/
  }

  function unlock() {
    setLocked(false);
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="logo">Floora</h1>
        <p className="admin-subtitle">Admin Portal</p> {/* different subtitle */}

        {/* NEW: show failed login error message */}
        {loginError && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {loginError}
          </div>
        )}

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
        {locked && false && ( //temporarily disable banner
          <div className="error-banner" role="alert" aria-live="assertive">
            Session locked — unlock this session to continue.
            <button type="button" className="unlock-btn" onClick={unlock}>
              Unlock
            </button>
          </div>
        )}

        <a href="#" className="forgot">Forgot Password?</a>

        <button type="submit" className="signin" disabled={loading}>
          {loading ? "Signing in…" : "Admin Sign In"}   {/* different button text */}
        </button>

        <p className="create-account">
          Not an admin? <Link to="/">Go to Client Login</Link>
        </p>
      </form>
    </div>
  );
}

function toFriendlyLoginMessage(msg: string) {
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait and try again.";
  }

  return "Login failed. Please try again.";
}
