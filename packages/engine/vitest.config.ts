import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      // index.ts is a re-export barrel; it has no branches to cover.
      exclude: ['src/index.ts'],
      thresholds: {
        // architecture.md §4 — the engine is the whole product.
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
        // phases.md P0.1 names these two explicitly.
        'src/fa/simulate.ts': { lines: 90, functions: 90, statements: 90, branches: 85 },
        'src/trace.ts': { lines: 90, functions: 90, statements: 90, branches: 85 },
      },
    },
  },
})
