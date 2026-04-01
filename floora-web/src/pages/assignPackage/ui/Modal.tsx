import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Narrower modals for simple confirms */
  width?: number;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const MODAL_FONT = "'Poppins', sans-serif";

const panelStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  maxHeight: "min(85vh, 640px)",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
  fontFamily: MODAL_FONT,
  color: "#1f2937",
};

export function Modal({
  open,
  title,
  onClose,
  children,
  width = 440,
}: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={overlayStyle}
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ ...panelStyle, maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: "1.05rem",
              fontWeight: 700,
              fontFamily: MODAL_FONT,
            }}
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
              color: "#444",
              fontFamily: MODAL_FONT,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 18, overflow: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
