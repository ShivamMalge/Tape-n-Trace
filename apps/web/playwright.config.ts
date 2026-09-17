import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests — the app in a real browser, against a production build.
 *
 * Vitest and jsdom cover the components; these cover what jsdom cannot: real
 * layout and pointer events (the board), hydration of the prerendered pages,
 * navigation between routes, storage across a reload, and the absence of
 * runtime errors on every page.
 *
 * `next start` serves `.next`, so build first: `pnpm test:e2e` does both, and
 * `pnpm e2e` runs against an existing build (as CI does, after its build step).
 */

const PORT = Number(process.env['E2E_PORT'] ?? 3100)
const CI = process.env['CI'] !== undefined

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // The README promises every page works on a phone; the mobile project runs
    // only the specs tagged for it.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
})
