import { getDisplayName } from "../displayName";

describe("ATH-102 Display Name Logic", () => {
  test("returns name if present", () => {
    expect(getDisplayName("Keshwa")).toBe("Keshwa");
  });

  test("returns fallback if empty", () => {
    expect(getDisplayName("")).toBe("Client");
    expect(getDisplayName("   ")).toBe("Client");
    expect(getDisplayName(null)).toBe("Client");
  });
});