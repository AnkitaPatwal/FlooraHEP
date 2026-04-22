import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./SessionNestedDropdown.css";

/** Solid right-pointing triangle (filled, not outlined). */
function CategoryArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={9}
      height={9}
      viewBox="0 0 14 14"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="0 0 0 14 12 7" fill="currentColor" />
    </svg>
  );
}

export type SessionNestedCategory = {
  label: string;
  sessions: Array<{ module_id: number; title: string }>;
};

export type SessionNestedDropdownProps = {
  categories: SessionNestedCategory[];
  disabled?: boolean;
  onSessionSelect: (moduleId: number) => void;
  placeholder?: string;
};

const SUBMENU_MAX_WIDTH_PX = 260;
const SUBMENU_SIDE_GAP_PX = 6;

function computeSubmenuDirection(slotEl: HTMLElement): "right" | "left" {
  const rect = slotEl.getBoundingClientRect();
  const spaceRight = window.innerWidth - rect.right - SUBMENU_SIDE_GAP_PX;
  if (spaceRight >= SUBMENU_MAX_WIDTH_PX) return "right";
  return "left";
}

/**
 * Nested category → sessions picker (floating menus, Tailwind-aligned styling via SessionNestedDropdown.css).
 */
export default function SessionNestedDropdown({
  categories,
  disabled,
  onSessionSelect,
  placeholder = "Select a Session",
}: SessionNestedDropdownProps) {
  const [open, setOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<{ moduleId: number; title: string } | null>(
    null,
  );
  const [submenuDirection, setSubmenuDirection] = useState<"right" | "left">("right");

  const rootRef = useRef<HTMLDivElement>(null);
  const categorySlotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      const t = e.target as Node | null;
      if (!el || !t || el.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setHoveredCategory(null);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || hoveredCategory == null) {
      setSubmenuDirection("right");
      return;
    }
    const slot = categorySlotRefs.current.get(hoveredCategory);
    if (!slot) return;
    setSubmenuDirection(computeSubmenuDirection(slot));
  }, [open, hoveredCategory, categories.length]);

  useEffect(() => {
    if (!open || hoveredCategory == null) return;

    const updateDirection = () => {
      const slot = categorySlotRefs.current.get(hoveredCategory);
      if (!slot) return;
      setSubmenuDirection(computeSubmenuDirection(slot));
    };

    window.addEventListener("resize", updateDirection);
    window.addEventListener("scroll", updateDirection, true);
    return () => {
      window.removeEventListener("resize", updateDirection);
      window.removeEventListener("scroll", updateDirection, true);
    };
  }, [open, hoveredCategory]);

  const triggerLabel = selectedSession?.title ?? placeholder;

  return (
    <div ref={rootRef} className="snd-root">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="snd-trigger"
      >
        <span className="snd-trigger-label">{triggerLabel}</span>
        <ChevronDown className="snd-chevron" aria-hidden strokeWidth={2} />
      </button>

      {open ? (
        <div className="snd-layer" role="presentation">
          <div className="snd-flyout">
            <div className="snd-categories" role="menu" aria-label="Categories">
              {categories.length === 0 ? (
                <div className="snd-empty">No categories</div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.label}
                    ref={(node) => {
                      if (node) categorySlotRefs.current.set(cat.label, node);
                      else categorySlotRefs.current.delete(cat.label);
                    }}
                    className="snd-category-slot"
                    onMouseEnter={() => setHoveredCategory(cat.label)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className={`snd-category-row ${hoveredCategory === cat.label ? "is-active" : ""}`}
                      onFocus={() => setHoveredCategory(cat.label)}
                      onClick={() => setHoveredCategory(cat.label)}
                    >
                      <span className="snd-category-label">{cat.label}</span>
                      <CategoryArrowIcon className="snd-category-arrow" />
                    </button>

                    {hoveredCategory === cat.label ? (
                      <div
                        className={`snd-submenu-anchor snd-submenu-anchor--${submenuDirection}`}
                      >
                        <div
                          className="snd-submenu"
                          role="menu"
                          aria-label={`Sessions in ${cat.label}`}
                        >
                          {cat.sessions.length === 0 ? (
                            <div className="snd-empty">No sessions</div>
                          ) : (
                            cat.sessions.map((s) => (
                              <button
                                key={s.module_id}
                                type="button"
                                role="menuitem"
                                className="snd-session-row"
                                onClick={() => {
                                  setSelectedSession({ moduleId: s.module_id, title: s.title });
                                  onSessionSelect(s.module_id);
                                  setOpen(false);
                                }}
                              >
                                {s.title}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
