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
      <p
        style={{
          marginTop: 0,
          marginBottom: 20,
          color: "#374151",
          fontSize: 15,
          lineHeight: 1.5,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {message}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid rgba(90, 142, 147, 0.45)",
            background: "#fff",
            color: "#5a8e93",
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "'Poppins', sans-serif",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.65 : 1,
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={
            destructive
              ? {
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid rgba(185, 28, 28, 0.35)",
                  background: "#fff",
                  color: "#b91c1c",
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "'Poppins', sans-serif",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }
              : {
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#5a8e93",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "'Poppins', sans-serif",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }
          }
        >
          {busy ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
