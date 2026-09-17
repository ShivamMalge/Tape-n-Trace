import { test, expect } from './fixtures'

/**
 * "Every page works on a phone" (README). Tagged @mobile, so the mobile project
 * runs these on a Pixel 7 viewport as well as the desktop one.
 */

const PAGES = ['/', '/simulate/dfa-contains-01', '/simulate/tm', '/simulate/pda', '/practice', '/regex', '/prove/pumping/zeros-ones-equal', '/board']

for (const path of PAGES) {
  test(`${path} does not scroll sideways @mobile`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeAttached()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1)
  })
}

test('the transport works by touch @mobile', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'needs a touch screen')
  await page.goto('/simulate/dfa-contains-01')
  const scrub = page.getByRole('slider', { name: 'Step' })
  const tap = (name: string) => page.getByRole('button', { name, exact: true }).tap()
  await tap('Next step')
  await tap('Next step')
  await expect(scrub).toHaveValue('2')
  await tap('Previous step')
  await expect(scrub).toHaveValue('1')
  await expect(page.getByText('1 of 4 read')).toBeVisible()
})
