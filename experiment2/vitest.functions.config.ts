import { defineConfig } from 'vitest/config'

// The interviewer function against the Auth, Firestore and Functions emulators (npm run test:functions).
// These tests never reach the model: they cover assignment, access and the stage check.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/functions/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
