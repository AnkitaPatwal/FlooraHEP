import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-client";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminAcceptInvite() {
  const q = useQuery();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Supabase puts the access_token in the URL hash after clicking invite link
  const hashParams = useMemo(() => new URLSearchParams(window.location.hash.slice(1)), []);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const type = hashParams.get("type"); // should be "invite"

  const isValidInvite = !!accessToken && type === "invite";

  const styles: Record<string, React.CSSProperties> = {
    container: {
      backgroundColor: "#3b7f7f",
      minHeight: "100vh",
      width: "100%",
      padding: 30,
      color: "#fff",
      fontFamily:
        "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
    },
    box: {
      maxWidth: 420,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    backBtn: {
      backgroundColor: "#f2f2f2",
      color: "#000",
      border: "none",
      borderRadius: "50%",
      width: 36,
      height: 36,
      fontSize: 20,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
    },
    h2: {
      fontSize: 28,
      fontWeight: 700,
      margin: 0,
      lineHeight: 1.15,
    },
    p: {
      fontSize: 14,
      margin: "0 0 18px 0",
      opacity: 0.95,
      lineHeight: 1.4,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    input: {
      padding: 10,
      border: "1px solid transparent",
      borderRadius: 8,
      backgroundColor: "#f5f5f5",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      width: "100%",
    },
    button: {
      backgroundColor: "#0d2d2d",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: 12,
      fontWeight: 700,
      cursor: "pointer",
      transition: "opacity 0.2s",
      width: "100%",
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    alert: {
      marginTop: 8,
      padding: "8px 10px",
      borderRadius: 6,
      fontSize: 14,
    },
    alertError: {
      backgroundColor: "#ffcccc",
      color: "#781515",
    },
    alertSuccess: {
      backgroundColor: "#c7f0c4",
      color: "#0f3a0f",
    },
    note: {
      marginTop: 14,
      fontSize: 12,
      opacity: 0.9,
      lineHeight: 1.4,
      textAlign: "center",
    },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Set the session from the invite tokens in the URL hash
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

      if (sessionError) {
        setError("Invite link is invalid or expired.");
        return;
      }

      // Step 2: Set the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to set password.");
        return;
      }

      setSuccess("Account created. Redirecting to login...");
      setTimeout(() => navigate("/admin-login", { replace: true }), 900);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.headerRow}>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => navigate("/admin-login")}
            aria-label="Back"
            title="Back"
          >
            ←
          </button>
          <h2 style={styles.h2}>Accept admin invite</h2>
        </div>

        {!isValidInvite ? (
          <div style={{ ...styles.alert, ...styles.alertError }}>
            Invalid invite link. Please ask a super admin to send a new invite.
          </div>
        ) : (
          <>
            <p style={styles.p}>
              Set a password to finish creating your admin account.
            </p>

            <form style={styles.form} onSubmit={handleSubmit}>
              <input
                style={styles.input}
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <input
                style={styles.input}
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />

              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(loading ? styles.buttonDisabled : null),
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (loading) return;
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                {loading ? "Creating account..." : "Create admin account"}
              </button>

              {error && (
                <div style={{ ...styles.alert, ...styles.alertError }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ ...styles.alert, ...styles.alertSuccess }}>
                  {success}
                </div>
              )}
            </form>

            <div style={styles.note}>
              Invite links expire after 24 hours. If yours is expired, ask a
              super admin to send a new invite.
            </div>
          </>
        )}
      </div>
    </div>
  );
}