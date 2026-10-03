import { defineConfig } from 'vitest/config'

// Security-rules tests run in Node against the Firestore emulator (npm run test:rules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: false,
  },
})
