import { test, expect } from './fixtures'

test('the module bar opens a module, follows a link, and closes on Escape', async ({ page }) => {
  await page.goto('/simulate/tm')
  const modules = page.getByRole('navigation', { name: 'Modules' })
  const first = modules.getByRole('button').first()
  await expect(first).toHaveAttribute('aria-expanded', 'false')

  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  const panel = page.getByRole('navigation', { name: 'Module 1 tools' })
  await expect(panel).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(first).toHaveAttribute('aria-expanded', 'false')

  await first.click()
  await panel.getByRole('link').first().click()
  await expect(page).not.toHaveURL(/\/simulate\/tm$/)
  await expect(page.locator('h1').first()).toBeVisible()
})

test('the theme choice persists across a reload, with no flash back', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const toggle = page.getByRole('button', { name: /Switch theme/ })

  await toggle.click() // Auto → Light
  await expect(html).toHaveAttribute('data-tnt-theme', 'light')
  await toggle.click() // Light → Dark
  await expect(html).toHaveAttribute('data-tnt-theme', 'dark')

  await page.reload()
  await expect(html).toHaveAttribute('data-tnt-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Theme: Dark. Switch theme' })).toBeVisible()

  await page.getByRole('button', { name: /Switch theme/ }).click() // Dark → Auto
  await expect(html).not.toHaveAttribute('data-tnt-theme', /.+/)
})
