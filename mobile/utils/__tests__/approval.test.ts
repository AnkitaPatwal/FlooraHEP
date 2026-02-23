import { isApproved } from "../approval";

describe("ATH-94 Approval Logic", () => {
  test("allows approved users", () => {
    expect(isApproved("approved")).toBe(true);
    expect(isApproved(" Approved ")).toBe(true);
  });

  test("blocks unapproved users", () => {
    expect(isApproved("pending")).toBe(false);
    expect(isApproved("rejected")).toBe(false);
    expect(isApproved("unapproved")).toBe(false);
  });

  test("blocks empty or null values", () => {
    expect(isApproved("")).toBe(false);
    expect(isApproved(null)).toBe(false);
    expect(isApproved(undefined)).toBe(false);
  });
});