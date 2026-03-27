module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Ignore compiled JS tests in dist; we only want to run the source .test.ts files.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'supabase/tests/rls.spec.ts',
    // Run explicitly: npm run test:integration:ath426 (needs live Postgres + Supabase API)
    'ath426-session-unlock.integration.spec.ts',
  ],
};
