import { test, expect } from './fixtures'

test.describe('finite automaton simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulate/dfa-contains-01')
  })

  test('arrives with a run loaded, and the transport walks it', async ({ page }) => {
    const transport = page.getByRole('toolbar', { name: 'Trace transport' })
    const scrub = transport.getByRole('slider', { name: 'Step' })
    await expect(page.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible()
    await expect(scrub).toHaveValue('0')
    await expect(transport.getByRole('button', { name: 'Previous step' })).toBeDisabled()

    await transport.getByRole('button', { name: 'Next step' }).click()
    await expect(scrub).toHaveValue('1')
    await expect(page.getByText('1 of 4 read')).toBeVisible()

    // Keyboard control lives on the toolbar. The scrub bar is the control that
    // stays enabled at both ends, so focus stays inside the toolbar.
    await scrub.focus()
    await page.keyboard.press('End')
    await expect(page.getByText('4 of 4 read')).toBeVisible()
    await expect(scrub).not.toHaveValue('1')
    await expect(transport.getByRole('button', { name: 'Next step' })).toBeDisabled()
    await page.keyboard.press('Home')
    await expect(scrub).toHaveValue('0')
  })

  test('a typed string runs, plays to the end, and is rejected', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Input' })
    await input.fill('1110')
    // Typing a space in the input must not toggle playback.
    await input.press('Space')
    await input.press('Backspace')
    await page.getByRole('button', { name: 'Run', exact: true }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Rejected' })).toBeVisible()
    // Run autoplays; it stops by itself at the last step.
    await expect(page.getByText('4 of 4 read')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled()
  })

  test('a Try chip loads and marks its string', async ({ page }) => {
    const chip = page.getByRole('group', { name: 'Try' }).getByRole('button', { name: '01', exact: true })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('textbox', { name: 'Input' })).toHaveValue('01')
    await expect(page.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible()
  })

  test('symbols outside the alphabet are reported, not run', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Input' }).fill('0a1')
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.getByText(/"a"/).first()).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /Accepted|Rejected/ })).toHaveCount(0)
  })

  test('the multi-run table tests many strings at once', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Strings to test, one per line' }).fill('01\n11\n\n1001')
    await page.getByRole('button', { name: 'Test all' }).click()
    const table = page.getByRole('table').filter({ hasText: 'of 4 accepted' })
    await expect(table.getByRole('caption')).toContainText('2 of 4 accepted')
    const result = (word: string) => table.getByRole('row').filter({ has: page.getByRole('button', { name: word, exact: true }) })
    await expect(result('01')).toContainText('accepted')
    await expect(result('11')).toContainText('rejected')
    await expect(result('ε')).toContainText('rejected')
    await expect(result('1001')).toContainText('accepted')

    // A row loads its run into the simulator above.
    await table.getByRole('button', { name: '1001', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Input' })).toHaveValue('1001')
  })
})

test.describe('Turing machine simulator', () => {
  test('0ⁿ1ⁿ accepts 0011 and writes the ID sequence', async ({ page }) => {
    await page.goto('/simulate/tm')
    await page.getByRole('group', { name: 'Try' }).getByRole('button', { name: '0011', exact: true }).click()
    const transport = page.getByRole('toolbar', { name: 'Trace transport' }).first()
    await transport.getByRole('slider', { name: 'Step' }).focus()
    await page.keyboard.press('End')
    await expect(page.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible()
    await expect(page.getByText(/⊢/).first()).toBeVisible()
  })

  test('a machine that does not halt is never reported as rejecting', async ({ page }) => {
    await page.goto('/simulate/tm')
    await page.getByRole('button', { name: 'A machine that does not halt' }).click()
    await page.getByRole('group', { name: 'Try' }).getByRole('button').first().click()
    const transport = page.getByRole('toolbar', { name: 'Trace transport' }).first()
    await transport.getByRole('slider', { name: 'Step' }).focus()
    await page.keyboard.press('End')

    const verdict = page.getByRole('status').filter({ hasText: /Stopped|Never halts|Accepted|Rejected/ })
    await expect(verdict).toHaveText(/Stopped|Never halts/)
    await expect(page.getByRole('status').filter({ hasText: 'Rejected' })).toHaveCount(0)
  })
})

test.describe('PDA simulator', () => {
  test('aⁿbⁿ accepts aaabbb and rejects aab', async ({ page }) => {
    await page.goto('/simulate/pda')
    const tries = page.getByRole('group', { name: 'Try' })
    const end = async (): Promise<void> => {
      await page.getByRole('toolbar', { name: 'Trace transport' }).first().getByRole('slider', { name: 'Step' }).focus()
      await page.keyboard.press('End')
    }

    await tries.getByRole('button', { name: 'aaabbb', exact: true }).click()
    await end()
    await expect(page.getByRole('status').filter({ hasText: 'Accepted' })).toBeVisible()

    await tries.getByRole('button', { name: 'aab', exact: true }).click()
    await end()
    await expect(page.getByRole('status').filter({ hasText: 'Rejected' })).toBeVisible()
  })
})
