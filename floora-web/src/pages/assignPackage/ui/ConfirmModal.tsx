import { Modal } from "./Modal";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={400}>
      <p style={{ marginTop: 0, marginBottom: 20, opacity: 0.9 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={
            destructive
              ? {
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid rgba(180,40,40,0.45)",
                  background: "#fff",
                  color: "#b22222",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }
              : undefined
          }
        >
          {busy ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
