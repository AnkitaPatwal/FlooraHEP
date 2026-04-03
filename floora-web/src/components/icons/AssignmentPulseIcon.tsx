/** ECG / pulse line (matches prior Material “vital_signs” look) — SVG so no font needed. */
export function AssignmentPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="14"
      height="14"
      aria-hidden
    >
      <path d="M4 12h2.5l1.5-6 3 12L14 6l2 6H20" />
    </svg>
  );
}
