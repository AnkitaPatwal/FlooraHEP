import React, { useEffect, useMemo, useRef, useState } from "react";
import "../components/AdminInlineMessage.css";
import {
  messageFromApiResponse,
  messageFromUnknownError,
  parseResponseJson,
} from "../lib/api-errors";
import { supabase } from "../lib/supabase-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AccessState = "checking" | "allowed" | "unauthenticated" | "forbidden";

type ApiBanner =
  | { variant: "error"; message: string }
  | { variant: "success"; message: string };

export default function CreateAdmin() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<ApiBanner | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const successDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (successDismissTimerRef.current) {
        clearTimeout(successDismissTimerRef.current);
      }
    };
  }, []);

  const dismissBanner = () => {
    if (successDismissTimerRef.current) {
      clearTimeout(successDismissTimerRef.current);
      successDismissTimerRef.current = null;
    }
    setBanner(null);
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setAccessState("unauthenticated");
          return;
        }

        const role = session.user.user_metadata?.role;

        if (role !== "super_admin") {
          setAccessState("forbidden");
          return;
        }

        setAccessState("allowed");
      } catch {
        setAccessState("unauthenticated");
      }
    };

    void checkAccess();
  }, []);

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return "Email is required.";
    if (!emailRegex.test(trimmed)) return "Enter a valid email address.";
    return null;
  }, [email]);

  const canSubmit = accessState === "allowed" && !isSubmitting;

  const submitInvite = async () => {
    if (emailError) {
      setSubmitAttempted(true);
      setEmailTouched(true);
      return;
    }
    dismissBanner();
    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${API_BASE}/api/admin/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
        }),
      });

      const body = await parseResponseJson(res);

      if (!res.ok) {
        setBanner({
          variant: "error",
          message: messageFromApiResponse(res, body, "Could not send invite."),
        });
        return;
      }

      setBanner({ variant: "success", message: "Invite sent successfully." });
      if (successDismissTimerRef.current) {
        clearTimeout(successDismissTimerRef.current);
      }
      successDismissTimerRef.current = setTimeout(() => {
        setBanner(null);
        successDismissTimerRef.current = null;
      }, 5000);
      setEmail("");
      setName("");
    } catch (e) {
      setBanner({
        variant: "error",
        message: messageFromUnknownError(e, "Could not send invite."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setEmailTouched(true);

    if (accessState !== "allowed") return;
    if (emailError) {
      return;
    }

    await submitInvite();
  };

  const handleRetry = () => {
    void submitInvite();
  };

  if (accessState === "checking") return <div>Loading...</div>;
  if (accessState === "unauthenticated")
    return <div>Unauthorized: please log in</div>;
  if (accessState === "forbidden")
    return <div>Unauthorized: you do not have access to this page</div>;

  return (
    <div style={{ width: "100%", maxWidth: 720, padding: 32 }}>
      <h2 style={{ marginBottom: 6 }}>Create Admin</h2>
      <p style={{ marginBottom: 18, opacity: 0.8 }}>
        Invite a new admin by email.
      </p>

      {banner && (
        <div
          className={`admin-inline-message admin-inline-message--${banner.variant}`}
          role={banner.variant === "error" ? "alert" : "status"}
          aria-live={banner.variant === "error" ? "assertive" : "polite"}
          style={{ marginBottom: 18 }}
        >
          <p className="admin-inline-message__text">{banner.message}</p>
          <div className="admin-inline-message__actions">
            {banner.variant === "error" && (
              <button
                type="button"
                className="admin-inline-message__btn"
                onClick={handleRetry}
                disabled={isSubmitting}
              >
                Retry
              </button>
            )}
            <button
              type="button"
              className="admin-inline-message__btn admin-inline-message__btn--ghost"
              onClick={dismissBanner}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>
            Email <span style={{ color: "crimson" }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              if (!emailTouched) setEmailTouched(true);
              if (banner) dismissBanner();
            }}
            onBlur={() => setEmailTouched(true)}
            placeholder="admin@example.com"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
          {(emailTouched || submitAttempted) && emailError && (
            <div style={{ color: "crimson", fontSize: 13 }}>{emailError}</div>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="name" style={{ fontWeight: 600 }}>
            Name <span style={{ opacity: 0.6 }}>(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(ev) => {
              setName(ev.target.value);
              if (banner) dismissBanner();
            }}
            placeholder="Admin Name"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSubmitting ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
