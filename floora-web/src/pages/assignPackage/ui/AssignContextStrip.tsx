import styles from "./assignContextStrip.module.css";

type AssignContextStripProps = {
  patientLabel: string | null;
  patientLoading?: boolean;
  /** Shown on the plan / sessions list page */
  planName?: string | null;
  /** Shown on the session (exercises) page — the session the user opened */
  sessionName?: string | null;
  /** default = gradient bar; plain = text only */
  variant?: "default" | "plain";
};

/**
 * Compact context: Patient | Plan or Patient | Session (Floora strip).
 */
export function AssignContextStrip({
  patientLabel,
  patientLoading,
  planName,
  sessionName,
  variant = "default",
}: AssignContextStripProps) {
  const patient =
    patientLoading === true ? "…" : patientLabel?.trim() || "—";

  const showPlan = Boolean(planName?.trim());
  const showSession = Boolean(sessionName?.trim());

  const stripClass =
    variant === "plain"
      ? `${styles.strip} ${styles.stripPlain}`
      : styles.strip;

  return (
    <div
      className={stripClass}
      role="status"
      aria-label="Current patient and plan or session"
    >
      <span className={styles.key}>Patient:</span>{" "}
      <strong>{patient}</strong>
      {showPlan && (
        <>
          <span className={styles.sep}>|</span>
          <span className={styles.key}>Plan:</span>{" "}
          <strong>{planName!.trim()}</strong>
        </>
      )}
      {showSession && (
        <>
          <span className={styles.sep}>|</span>
          <span className={styles.key}>Session:</span>{" "}
          <strong>{sessionName!.trim()}</strong>
        </>
      )}
    </div>
  );
}
