import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'

/**
 * The classroom board with real pointer strokes — the one screen jsdom cannot
 * exercise, since recognition depends on layout, pointer capture and the
 * measured size of the SVG.
 */

type Point = { x: number; y: number }

function loop(centre: Point, radius: number, from = 0): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= 36; i++) {
    const angle = from + (i / 36) * 2 * Math.PI * 0.97
    points.push({ x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) })
  }
  return points
}

function line(a: Point, b: Point, steps = 20): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }))
}

async function stroke(page: Page, canvas: Locator, points: Point[]): Promise<void> {
  const box = await canvas.boundingBox()
  if (box === null) throw new Error('the board has no box')
  const [first, ...rest] = points as [Point, ...Point[]]
  await page.mouse.move(box.x + first.x, box.y + first.y)
  await page.mouse.down()
  for (const p of rest) await page.mouse.move(box.x + p.x, box.y + p.y)
  await page.mouse.up()
}

/** Run a string from the panel and scrub to its last step, where the verdict shows. */
async function runTo(panel: Locator, word: string): Promise<Locator> {
  const input = panel.getByRole('textbox', { name: 'Input string' })
  await input.fill(word)
  await input.press('Enter')
  const scrub = panel.getByRole('slider', { name: 'Step' })
  await expect(scrub).toBeEnabled()
  await scrub.focus()
  await scrub.press('End')
  return panel.getByRole('status')
}

const Q0 = { x: 220, y: 300 }
const Q1 = { x: 560, y: 300 }

test.describe('classroom board', () => {
  let canvas: Locator
  let badge: Locator

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/board')
    await page.evaluate(() => window.localStorage.removeItem('tnt-board'))
    await page.reload()
    canvas = page.getByRole('application', { name: /Classroom board/ })
    badge = page.locator('.tnt-board-badge')
  })

  async function drawTwoStates(page: Page): Promise<void> {
    await stroke(page, canvas, loop(Q0, 45))
    await expect(badge).toContainText('the start state')
    await stroke(page, canvas, loop(Q1, 45))
    await expect(page.getByText('2 states · 0 arcs')).toBeVisible()
  }

  test('draw a machine for strings ending in a, and run it', async ({ page }) => {
    await drawTwoStates(page)

    // q0 → q1 on a
    await stroke(page, canvas, line(Q0, Q1))
    const toQ1 = page.getByRole('group', { name: 'Label the arc from q0 to q1' })
    await expect(toQ1).toBeVisible()
    await toQ1.getByRole('button', { name: 'a', exact: true }).click()
    await expect(toQ1.getByRole('button', { name: 'a', exact: true })).toHaveAttribute('aria-pressed', 'true')

    // A round self-loop on q0 on b, drawn the way the book draws it.
    await stroke(page, canvas, loop({ x: Q0.x, y: Q0.y - 70 }, 40, Math.PI / 2))
    const onQ0 = page.getByRole('group', { name: 'Label the arc from q0 to q0' })
    await expect(onQ0).toBeVisible()
    await onQ0.getByRole('button', { name: 'b', exact: true }).click()

    // A second ring inside q1 makes it accepting.
    await stroke(page, canvas, loop(Q1, 25))
    await expect(badge).toContainText('q₁ is accepting')

    await page.getByRole('button', { name: 'Simulate' }).click()
    const panel = page.getByRole('complementary', { name: 'Transition table and run' })
    await expect(panel).toBeVisible()
    // δ(q0, a) = q1 and δ(q0, b) = q0, in the columns State a b 0 1 ε.
    await expect(panel.getByRole('row').filter({ hasText: '→' }).getByRole('cell')).toHaveText(['q₁', 'q₀', '—', '—', '—'])

    await expect(await runTo(panel, 'ba')).toHaveText(/Accepted/)
    await expect(await runTo(panel, 'ab')).toHaveText(/Rejected/)
  })

  test('the drawing survives a reload, and undo and redo walk it', async ({ page }) => {
    await drawTwoStates(page)
    await page.reload()
    await expect(page.getByText('2 states · 0 arcs')).toBeVisible()

    await stroke(page, canvas, loop({ x: 900, y: 300 }, 45))
    await expect(page.getByText('3 states · 0 arcs')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('2 states · 0 arcs')).toBeVisible()
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByText('3 states · 0 arcs')).toBeVisible()
  })

  test('undo closes the arc picker and drops a stale verdict', async ({ page }) => {
    await drawTwoStates(page)
    await stroke(page, canvas, line(Q0, Q1))
    await page.getByRole('group', { name: 'Label the arc from q0 to q1' }).getByRole('button', { name: 'a', exact: true }).click()
    await stroke(page, canvas, loop(Q1, 25))

    await page.getByRole('button', { name: 'Simulate' }).click()
    const panel = page.getByRole('complementary', { name: 'Transition table and run' })
    await expect(await runTo(panel, 'a')).toHaveText(/Accepted/)

    await page.getByRole('button', { name: 'Undo' }).click() // q1 no longer accepting
    await expect(panel.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('group', { name: /Label the arc/ })).toHaveCount(0)
  })

  test('a scribble rubs a state out, and a stroke to nowhere is explained', async ({ page }) => {
    await drawTwoStates(page)

    await stroke(page, canvas, line(Q0, { x: Q0.x, y: 600 }))
    await expect(badge).toContainText('not recognised')

    const scribble: Point[] = []
    for (let i = 0; i < 8; i++) scribble.push({ x: Q1.x - 40, y: Q1.y - 30 + i * 8 }, { x: Q1.x + 40, y: Q1.y - 26 + i * 8 })
    await stroke(page, canvas, scribble)
    await expect(badge).toContainText('rubbed out')
    await expect(page.getByText(/^1 states? · 0 arcs$/)).toBeVisible()
  })
})
