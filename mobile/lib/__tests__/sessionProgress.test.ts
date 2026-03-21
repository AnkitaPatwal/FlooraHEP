jest.mock("../supabaseClient", () => ({
  supabase: {},
}));

import { getCurrentSession, type ModuleProgress } from "../sessionProgress";

describe("sessionProgress", () => {
  describe("getCurrentSession", () => {
    it("returns the lowest-numbered unlocked session not yet completed", () => {
      const progress: ModuleProgress[] = [
        { module_id: 1, order_index: 1, title: "Session 1", status: "completed" },
        { module_id: 2, order_index: 2, title: "Session 2", status: "unlocked" },
        { module_id: 3, order_index: 3, title: "Session 3", status: "locked" },
      ];
      expect(getCurrentSession(progress)).toEqual(progress[1]);
    });

    it("returns first unlocked when Session 1 is unlocked", () => {
      const progress: ModuleProgress[] = [
        { module_id: 1, order_index: 1, title: "Session 1", status: "unlocked" },
        { module_id: 2, order_index: 2, title: "Session 2", status: "locked" },
      ];
      expect(getCurrentSession(progress)).toEqual(progress[0]);
    });

    it("returns null when all are locked or completed", () => {
      const progress: ModuleProgress[] = [
        { module_id: 1, order_index: 1, title: "Session 1", status: "completed" },
        { module_id: 2, order_index: 2, title: "Session 2", status: "locked" },
      ];
      expect(getCurrentSession(progress)).toBeNull();
    });

    it("returns null for empty array", () => {
      expect(getCurrentSession([])).toBeNull();
    });
  });
});
