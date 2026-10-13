import { defineConfig } from 'vitest/config'

// Load test against the emulators (npm run test:load). Slow, so not part of test:rules.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/load/**/*.test.ts'],
  },
})
