import { useEffect, type ReactNode } from "react";
import "./ConfirmDialog.css";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

function IconDanger() {
  return (
    <svg className="confirm-dialog-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPrimary() {
  return (
    <svg className="confirm-dialog-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  busy,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="confirm-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className={`confirm-dialog confirm-dialog--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`confirm-dialog-icon-wrap confirm-dialog-icon-wrap--${variant}`}
          aria-hidden
        >
          {isDanger ? <IconDanger /> : <IconPrimary />}
        </div>
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog-text">{message}</p>
        {children ? <div className="confirm-dialog-extra">{children}</div> : null}
        <div className="confirm-dialog-actions confirm-dialog-actions--stacked">
          <button
            type="button"
            className={`confirm-dialog-btn confirm-dialog-btn--full ${
              isDanger ? "confirm-dialog-btn--danger" : "confirm-dialog-btn--primary"
            }`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--full confirm-dialog-btn--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
