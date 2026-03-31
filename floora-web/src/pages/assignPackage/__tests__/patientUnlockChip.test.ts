import { describe, expect, it } from "vitest";
import { patientUnlockChip } from "../patientUnlockChip";

describe("patientUnlockChip", () => {
  it("returns available when unlock is in the past", () => {
    const past = "2020-01-01T12:00:00.000Z";
    const r = patientUnlockChip(past, Date.now());
    expect(r.variant).toBe("available");
    expect(r.label).toBe("Available for patient");
  });

  it("returns scheduled when unlock is in the future", () => {
    const future = "2099-06-15T15:30:00.000Z";
    const r = patientUnlockChip(future, Date.parse("2025-01-01T00:00:00.000Z"));
    expect(r.variant).toBe("scheduled");
    expect(r.label).toMatch(/^Unlocks /);
  });

  it("returns unknown when iso is null", () => {
    const r = patientUnlockChip(null);
    expect(r.variant).toBe("unknown");
    expect(r.label).toBe("Included");
  });
});
