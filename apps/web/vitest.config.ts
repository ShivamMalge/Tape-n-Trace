import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The app's tsconfig sets `jsx: "preserve"` because Next does the transform.
  // Vitest has no Next, so esbuild is told to use the automatic runtime here;
  // without it JSX compiles to `React.createElement` and every render throws
  // "React is not defined".
  //
  // Deliberately no @vitejs/plugin-react: it exists for Fast Refresh, which is
  // meaningless in a test run, and it pulls in a second major version of Vite
  // alongside the one vitest ships — which then fails `next build`'s typecheck
  // on two incompatible `Plugin` types.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },

  resolve: {
    // Mirrors next.config.ts: the workspace packages import with `.js`
    // extensions for real Node ESM, and the bundler substitutes `.ts`.
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    globals: false,
  },
})
