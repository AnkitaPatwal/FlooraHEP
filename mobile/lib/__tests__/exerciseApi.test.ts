describe("exerciseApi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isExerciseApiConfigured", () => {
    it("returns false when EXPO_PUBLIC_BACKEND_URL is not set", () => {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
      const { isExerciseApiConfigured } = require("../exerciseApi");
      expect(isExerciseApiConfigured()).toBe(false);
    });

    it("returns false when EXPO_PUBLIC_BACKEND_URL is empty string", () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "";
      const { isExerciseApiConfigured } = require("../exerciseApi");
      expect(isExerciseApiConfigured()).toBe(false);
    });

    it("returns true when EXPO_PUBLIC_BACKEND_URL is set", () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      const { isExerciseApiConfigured } = require("../exerciseApi");
      expect(isExerciseApiConfigured()).toBe(true);
    });
  });

  describe("fetchExerciseById", () => {
    it("returns null when backend URL is not configured", async () => {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
      const { fetchExerciseById } = require("../exerciseApi");
      const result = await fetchExerciseById(1);
      expect(result).toBeNull();
    });

    it("returns null for invalid id", async () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      const { fetchExerciseById } = require("../exerciseApi");
      expect(await fetchExerciseById(0)).toBeNull();
      expect(await fetchExerciseById(-1)).toBeNull();
      expect(await fetchExerciseById("abc")).toBeNull();
    });

    it("fetches exercise and returns data with video_url", async () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      const mockData = {
        exercise_id: 1,
        title: "Test",
        description: "Desc",
        video_url: "https://example.com/signed.mp4",
      };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });
      const { fetchExerciseById } = require("../exerciseApi");
      const result = await fetchExerciseById(1);
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/exercises/1",
        expect.objectContaining({ method: "GET", headers: { Accept: "application/json" } })
      );
    });

    it("returns null on 404", async () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 });
      const { fetchExerciseById } = require("../exerciseApi");
      const result = await fetchExerciseById(999);
      expect(result).toBeNull();
    });

    it("throws on non-2xx with message", async () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Database error" }),
      });
      const { fetchExerciseById } = require("../exerciseApi");
      await expect(fetchExerciseById(1)).rejects.toThrow("Database error");
    });
  });

  describe("fetchExerciseList", () => {
    it("returns empty array when backend URL is not configured", async () => {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
      const { fetchExerciseList } = require("../exerciseApi");
      const result = await fetchExerciseList();
      expect(result).toEqual([]);
    });

    it("returns data array from API", async () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = "http://localhost:3000";
      const mockData = [
        { exercise_id: 1, title: "A", description: "D", video_url: "https://a.com/1.mp4" },
      ];
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });
      const { fetchExerciseList } = require("../exerciseApi");
      const result = await fetchExerciseList();
      expect(result).toEqual(mockData);
    });
  });
});
