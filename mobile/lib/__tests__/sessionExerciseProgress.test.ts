import { isExercisePositionUnlocked } from "../sessionExerciseProgress";

describe("sessionExerciseProgress", () => {
  describe("isExercisePositionUnlocked", () => {
    it("unlocks only the first exercise when nothing is completed", () => {
      expect(isExercisePositionUnlocked(0, 1)).toBe(true);
      expect(isExercisePositionUnlocked(0, 2)).toBe(false);
    });

    it("unlocks through the next exercise after each completion", () => {
      expect(isExercisePositionUnlocked(1, 1)).toBe(true);
      expect(isExercisePositionUnlocked(1, 2)).toBe(true);
      expect(isExercisePositionUnlocked(1, 3)).toBe(false);
    });
  });
});
