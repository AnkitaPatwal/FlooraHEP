module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  // Async UI tests (waitFor / Supabase mocks) can exceed 5s on slower machines / Windows CI.
  testTimeout: 15000,
};