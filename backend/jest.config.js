module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Ignore compiled JS tests in dist; we only want to run the source .test.ts files.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'supabase/tests/rls.spec.ts'],
};
