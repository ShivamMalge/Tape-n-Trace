import { test as base, expect } from '@playwright/test'

/**
 * A page that fails the test on any uncaught exception or console error —
 * hydration mismatches and render crashes included, which is most of what a
 * production build can get wrong that the unit tests cannot see.
 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await use(errors)
      expect(errors, 'runtime errors on the page').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
