export type PatientUnlockChipVariant = "available" | "scheduled" | "unknown";

/** Clinician-facing copy: compares unlock_date to now (patient can open session). */
export function patientUnlockChip(
  unlockDateIso: string | null,
  nowMs: number = Date.now(),
): { variant: PatientUnlockChipVariant; label: string } {
  if (!unlockDateIso) {
    return { variant: "unknown", label: "Included" };
  }
  const t = new Date(unlockDateIso).getTime();
  if (Number.isNaN(t)) {
    return { variant: "unknown", label: "Included" };
  }
  if (t <= nowMs) {
    return { variant: "available", label: "Available for patient" };
  }
  const d = new Date(unlockDateIso);
  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return {
    variant: "scheduled",
    label: `Unlocks ${dateStr} · ${timeStr}`,
  };
}
