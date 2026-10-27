import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  plugins: [react()],
  // MapLibre's tile worker is an ES module.
  worker: { format: 'es' },
  // Part 1 (index.html) and Part 2 are separate pages of one site.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        part2: fileURLToPath(new URL('./part2.html', import.meta.url)),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'functions/src/**/*.test.ts'],
    exclude: ['tests/rules/**', 'tests/load/**', 'tests/functions/**', '**/node_modules/**'],
  },
})
