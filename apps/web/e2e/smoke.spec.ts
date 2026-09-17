import { test, expect } from './fixtures'

/**
 * Every page loads, hydrates and names itself, with no runtime errors.
 *
 * The routes are crawled from the site's own index pages rather than listed
 * here, so a tool added to the catalog is covered without touching this file.
 */

const INDEXES = ['/', '/simulate', '/convert', '/practice', '/prove/pumping', '/applied', '/undecidable']

test('every linked page renders a heading without errors', async ({ page, request }) => {
  test.slow()
  const routes = new Set<string>(INDEXES)
  for (const index of INDEXES) {
    await page.goto(index)
    const hrefs = await page.locator('main a[href^="/"]').evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
    )
    for (const href of hrefs) routes.add(href.split('#')[0] as string)
  }
  routes.delete('')

  for (const route of routes) {
    const response = await request.get(route)
    expect(response.status(), `${route} status`).toBe(200)
    await page.goto(route)
    await expect(page.locator('h1').first(), `${route} heading`).toBeVisible()
  }
})

test('an unknown machine is a 404, not a crash', async ({ page, errors }) => {
  const response = await page.goto('/simulate/no-such-machine')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  errors.length = 0 // the browser logs the 404 resource itself
})

test('the old editor addresses redirect', async ({ page }) => {
  await page.goto('/edit')
  await expect(page).toHaveURL(/\/board$/)
  await page.goto('/edit/dfa-contains-01')
  await expect(page).toHaveURL(/\/simulate\/dfa-contains-01$/)
})
