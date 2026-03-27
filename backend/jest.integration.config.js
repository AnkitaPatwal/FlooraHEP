/**
 * Run only Supabase-backed integration specs (Postgres + Auth must be reachable).
 * Usage: npm run test:integration:ath426
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/supabase/tests/ath426-session-unlock.integration.spec.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
