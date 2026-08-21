/**
 * The Module 3 grammar pages, driven as a student would.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DerivationWorkbench } from '../components/derivation-workbench'
import { AmbiguityWorkbench } from '../components/ambiguity-workbench'
import { LeftRecursionWorkbench } from '../components/left-recursion-workbench'

afterEach(cleanup)

/** Let the debounced grammar input settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
  })
}

describe('the derivation workbench', () => {
  it('derives aabb in the opening grammar and shows tree, strip and yield', async () => {
    const user = userEvent.setup()
    render(<DerivationWorkbench />)
    await settle()

    await user.click(screen.getByRole('button', { name: /^derive$/i }))

    // The trace opens at step 0; the summary is reachable through the slider.
    const slider = screen.getByRole('slider', { name: 'Step' })
    act(() => {
      fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
    })

    expect(screen.getByText(/yield: a a b b/)).toBeDefined()
    expect(screen.getByText(/parse tree's yield reads the same string/)).toBeDefined()
  })

  it('reports a bounded miss as a bound, not as non-membership', async () => {
    const user = userEvent.setup()
    render(<DerivationWorkbench />)
    await settle()

    // Two textboxes exist: the grammar textarea and the target input.
    const target = screen.getByRole('textbox', { name: /derive this string/i })
    await user.clear(target)
    await user.type(target, 'aab')
    await user.click(screen.getByRole('button', { name: /^derive$/i }))

    expect(screen.getByRole('status').textContent).toContain('bound, not a verdict')
  })

  it('shows positioned grammar errors, all at once', async () => {
    const user = userEvent.setup()
    render(<DerivationWorkbench />)
    await settle()

    const box = screen.getByRole('textbox', { name: /grammar/i })
    await user.clear(box)
    await user.type(box, 'no arrow{enter}S -> a | | b')
    await settle()

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('no arrow')
    expect(alert.textContent).toContain('empty')
    expect(alert.textContent).toContain('line 1')
  })
})

describe('the ambiguity detector', () => {
  it('proves the classic grammar ambiguous with two trees', async () => {
    const user = userEvent.setup()
    render(<AmbiguityWorkbench />)
    await settle()

    await user.click(screen.getByRole('button', { name: /search for an ambiguous string/i }))

    expect(screen.getByText(/Ambiguous — proven/)).toBeDefined()
    expect(screen.getByText('Parse tree 1')).toBeDefined()
    expect(screen.getByText('Parse tree 2')).toBeDefined()
  })

  it('gives the unambiguous rewrite "no counterexample within bounds"', async () => {
    const user = userEvent.setup()
    render(<AmbiguityWorkbench />)
    await settle()

    await user.click(screen.getByRole('button', { name: /the exam expression grammar/i }))
    await settle()
    await user.click(screen.getByRole('button', { name: /search for an ambiguous string/i }))

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('No counterexample within bounds')
    expect(status.textContent).toContain('undecidable')
    expect(status.textContent?.toLowerCase()).not.toMatch(/is unambiguous/)
  }, 30_000)
})

describe('left recursion elimination', () => {
  it('rewrites the exam grammar and warns about the ε-productions', async () => {
    const user = userEvent.setup()
    render(<LeftRecursionWorkbench />)
    await settle()

    expect(screen.getByText(/is left-recursive/)).toBeDefined()

    await user.click(screen.getByRole('button', { name: /eliminate left recursion/i }))

    const slider = screen.getByRole('slider', { name: 'Step' })
    act(() => {
      fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
    })

    expect(screen.getByText(/no left-recursive chain remains/)).toBeDefined()
    expect(screen.getByText(/The order trap/)).toBeDefined()
    expect(screen.getByText(/introduces ε-productions/)).toBeDefined()
  })

  it('refuses a grammar with ε-productions, naming the production', async () => {
    const user = userEvent.setup()
    render(<LeftRecursionWorkbench />)
    await settle()

    const box = screen.getByRole('textbox', { name: /grammar/i })
    await user.clear(box)
    await user.type(box, 'A -> Aa | ε')
    await settle()
    await user.click(screen.getByRole('button', { name: /eliminate left recursion/i }))

    expect(screen.getByRole('alert').textContent).toContain('ε-production')
  })
})

describe('under fake timers the input debounce still settles', () => {
  it('parses after the debounce window', () => {
    vi.useFakeTimers()
    try {
      render(<DerivationWorkbench />)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByText(/1 variables/)).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })
})
