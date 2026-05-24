// Vitest config — pure-function tests only (no DOM, no React).
// The orchestration engine and its scorers are dependency-free, so
// the default `node` environment is fine. Tests live next to the code
// in `__tests__/` directories.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    testTimeout: 10_000,           // generous default; latency suite overrides
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/orchestration/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.ts'],
    },
  },
})
