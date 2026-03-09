import React, { useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAdmin() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return "Email is required.";
    if (!emailRegex.test(trimmed)) return "Enter a valid email address.";
    return null;
  }, [email]);

  const canSubmit = !isSubmitting && !emailError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (emailError) {
      setErrorMsg(emailError);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`${API_URL}/api/admin/assign-admin-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ cookie auth
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          (res.status === 401 || res.status === 403
            ? "Unauthorized access."
            : "Backend failure. Please try again.");
        setErrorMsg(msg);
        return;
      }

      setSuccessMsg("Admin role assigned successfully.");
      setEmail("");
      setName("");
    } catch {
      setErrorMsg("Backend failure. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
   <div style={{ width: "100%", maxWidth: 720, padding: 32 }}>
      <h2 style={{ marginBottom: 6 }}>Create Admin</h2>
      <p style={{ marginBottom: 18, opacity: 0.8 }}>Assign admin role to an existing account.</p>

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
              if (errorMsg) setErrorMsg(null);
              if (successMsg) setSuccessMsg(null);
            }}
            placeholder="admin@example.com"
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />

          {emailError && <div style={{ color: "crimson", fontSize: 13 }}>{emailError}</div>}
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
              if (errorMsg) setErrorMsg(null);
              if (successMsg) setSuccessMsg(null);
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

        {successMsg && <div style={{ color: "green", fontWeight: 600 }}>{successMsg}</div>}
        {errorMsg && <div style={{ color: "crimson", fontWeight: 600 }}>{errorMsg}</div>}
      </form>
    </div>
  );
}
