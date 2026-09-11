import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Values here land in process.env BEFORE any test file (and therefore
    // before src/config/env.ts) is imported, so the app under test always
    // talks to the dedicated test database, never the dev one.
    env: {
      DATABASE_URL: 'postgresql://anilsaripiralla@localhost:5432/mini_erp_crm_test',
      JWT_SECRET: 'test-only-secret-please-do-not-reuse',
      JWT_EXPIRES_IN: '1h',
      PORT: '4001',
      FRONTEND_URL: 'http://localhost:5173',
      NODE_ENV: 'test',
    },
    testTimeout: 15000,
    hookTimeout: 20000,
    // All test files share one Postgres database and each resets it in
    // beforeAll, so files must run one at a time rather than concurrently.
    fileParallelism: false,
  },
});
