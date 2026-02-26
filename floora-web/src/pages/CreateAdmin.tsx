import { useMemo, useState } from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAdmin() {
  const [email, setEmail] = useState("");
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
      setSuccessMsg(null);
      setErrorMsg(emailError);
      return;
    }

    try {
      setIsSubmitting(true);

      // simulate success
      await new Promise((r) => setTimeout(r, 700));

      setErrorMsg(null);
      setSuccessMsg("Admin created successfully.");
      setEmail("");
    } catch {
      setSuccessMsg(null);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
   <div style={{ width: "100%", maxWidth: 720, padding: 32 }}>
      <h2 style={{ marginBottom: 6 }}>Create Admin</h2>
      <p style={{ marginBottom: 18, opacity: 0.8 }}>
        Create an admin account.
      </p>

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
              // keep UI clean: clear old messages while typing
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

          {emailError && (
            <div style={{ color: "crimson", fontSize: 13 }}>{emailError}</div>
          )}
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
          {isSubmitting ? "Creating..." : "Submit"}
        </button>

        {successMsg && (
          <div style={{ color: "green", fontWeight: 600 }}>{successMsg}</div>
        )}
        {errorMsg && (
          <div style={{ color: "crimson", fontWeight: 600 }}>{errorMsg}</div>
        )}
      </form>
    </div>
  );
}