import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

test.describe('practice', () => {
  async function addTransition(page: Page, from: string, read: string, to: string): Promise<void> {
    await page.getByRole('combobox', { name: 'From' }).selectOption(from)
    await page.getByRole('combobox', { name: 'Reads' }).selectOption(read)
    await page.getByRole('combobox', { name: 'To' }).selectOption(to)
    await page.getByRole('button', { name: 'Add transition' }).click()
  }

  test('a wrong machine gets a witness string; a right one passes', async ({ page }) => {
    await page.goto('/practice/m1-starts-ab')

    // The starting machine accepts nothing, so the shortest disagreement is "ab".
    const verdict = page.getByRole('status').filter({ hasText: 'exact grading' })
    await page.getByRole('button', { name: 'Grade my machine' }).click()
    await expect(verdict).toContainText('Not equivalent')
    await expect(verdict).toContainText('Your machine rejects "ab", but "ab" is in the language.')
    await expect(page.getByRole('heading', { name: 'Watch them disagree on "ab"' })).toBeVisible()

    // q0 -a-> q1 -b-> q2, q2 loops on a and b and accepts. Partial is fine: the
    // missing moves are the trap state.
    await page.getByRole('button', { name: 'Add state' }).click()
    await page.getByRole('button', { name: 'Add state' }).click()
    await addTransition(page, 'q0', 'a', 'q1')
    await addTransition(page, 'q1', 'b', 'q2')
    await addTransition(page, 'q2', 'a', 'q2')
    await addTransition(page, 'q2', 'b', 'q2')
    await page.getByRole('checkbox', { name: 'Make q2 an accepting state' }).check()

    await page.getByRole('button', { name: 'Grade my machine' }).click()
    await expect(page.getByRole('status').filter({ hasText: /^Correct/ })).toContainText(
      'Any machine for this language accepts exactly what yours does.',
    )
    await expect(verdict).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Watch them disagree/ })).toHaveCount(0)
  })

  test('the filters narrow the question bank', async ({ page }) => {
    await page.goto('/practice')
    const count = page.getByText(/^\d+ of \d+ exercises$/)
    await expect(count).toHaveText(/^(\d+) of \1 exercises$/)
    await page.getByRole('button', { name: 'Module 5' }).click()
    await expect(page.getByRole('button', { name: 'Module 5' })).toHaveAttribute('aria-pressed', 'true')
    await expect(count).not.toHaveText(/^(\d+) of \1 exercises$/)
    await expect(page.getByRole('listitem').first()).toContainText('M5')
  })
})

test.describe('pumping lemma game', () => {
  test('attacking 0ⁿ1ⁿ wins, and the proof is written out', async ({ page }) => {
    await page.goto('/prove/pumping/zeros-ones-equal')
    const claim = await page.getByText(/pumping length of n = \d+/).textContent()
    const n = Number(/n = (\d+)/.exec(claim ?? '')?.[1])
    expect(n).toBeGreaterThan(0)

    await page.getByRole('textbox', { name: 'Your string w' }).fill('0'.repeat(n) + '1'.repeat(n))
    await page.getByRole('button', { name: 'Challenge' }).click()

    // |xy| ≤ n puts y inside the zeros whatever the engine picks, so i = 0 wins.
    await page.getByRole('spinbutton', { name: /Your i/ }).fill('0')
    await page.getByRole('button', { name: 'Pump' }).click()
    await expect(page.getByText(/which is NOT in the language\. .*you win the round/)).toBeVisible()
    const proof = page.getByRole('region', { name: 'The proof, written out' })
    await expect(proof).toContainText(`take n = ${n} as played`)
    await expect(proof).toContainText(`Choose w = ${'0'.repeat(n)}${'1'.repeat(n)} ∈ L`)
  })

  test('a string outside the language is refused', async ({ page }) => {
    await page.goto('/prove/pumping/zeros-ones-equal')
    await page.getByRole('textbox', { name: 'Your string w' }).fill('0101010101')
    await page.getByRole('button', { name: 'Challenge' }).click()
    await expect(page.locator('main').getByRole('alert')).toContainText('"0101010101" is not in L = { 0ⁿ1ⁿ : n ≥ 0 }')
    await expect(page.getByRole('button', { name: 'Pump' })).toHaveCount(0)
  })
})

test.describe('regular expression playground', () => {
  test('the four views follow the expression', async ({ page }) => {
    await page.goto('/regex')
    const regex = page.getByRole('textbox', { name: 'Regular expression' })
    await regex.fill('0*1*')
    await expect(page.getByRole('group', { name: /^Parse tree with \d+ nodes$/ })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Star for 0*' })).toBeVisible()

    await regex.fill('(0+')
    await expect(regex).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('main').getByRole('alert')).toHaveText('The union at position 2 is missing one of its two sides.')
    await expect(page.getByText('Nothing to show until the expression parses.').first()).toBeVisible()
  })
})

test('the NFA → DFA stepper builds the subset table', async ({ page }) => {
  await page.goto('/convert/nfa-to-dfa')
  const table = page.getByRole('table', { name: /The subset table/ })
  await expect(table.getByRole('row')).toHaveCount(2)
  const scrub = page.getByRole('slider', { name: 'Step' })
  await scrub.focus()
  await scrub.press('End')
  // Fig. 2.13: the reachable subsets of the "ends in 01" NFA are {q0}, {q0,q1}, {q0,q2}.
  await expect(table.getByRole('row')).toHaveCount(4)
  await expect(page.getByText('3 of 3 states')).toBeVisible()
})
