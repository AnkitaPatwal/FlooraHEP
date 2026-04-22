import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./PlanSelectDropdown.css";

export type PlanSelectOption = {
  plan_id: number;
  title: string;
};

export type PlanSelectDropdownProps = {
  plans: PlanSelectOption[];
  /** Selected plan id, or null for placeholder */
  selectedPlanId: number | null;
  disabled?: boolean;
  /** Called with plan id string; use "" only if you add a clear action */
  onSelect: (planIdStr: string) => void;
};

export default function PlanSelectDropdown({
  plans,
  selectedPlanId,
  disabled,
  onSelect,
}: PlanSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      const t = e.target as Node | null;
      if (!root || !t || root.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerLabel =
    selectedPlanId != null
      ? plans.find((p) => p.plan_id === selectedPlanId)?.title?.trim() || "Select a Plan"
      : "Select a Plan";

  return (
    <div ref={rootRef} className="psd-root">
      <button
        type="button"
        className="psd-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="psd-trigger-label">{triggerLabel}</span>
        <ChevronDown className="psd-trigger-chevron" aria-hidden strokeWidth={2} />
      </button>

      {open && !disabled ? (
        <div className="psd-menu" role="listbox">
          <div className="psd-menu-inner">
            {plans.map((p) => (
              <button
                key={p.plan_id}
                type="button"
                role="option"
                aria-selected={selectedPlanId === p.plan_id}
                className={`psd-option ${selectedPlanId === p.plan_id ? "is-selected" : ""}`}
                onClick={() => {
                  onSelect(String(p.plan_id));
                  setOpen(false);
                }}
              >
                {p.title}
              </button>
            ))}
            {plans.length === 0 ? (
              <div className="psd-empty">No plans available</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
