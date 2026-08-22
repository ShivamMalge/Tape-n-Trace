/**
 * The Module 4 pages — the simplification pipeline and the CFL closure lab —
 * driven as a student would. phases.md P1.5.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimplifyPipeline } from '../components/simplify-pipeline'
import { CflClosureLab } from '../components/cfl-closure-lab'

afterEach(cleanup)

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350))
  })
}

function scrubToEnd(index = 0): void {
  const slider = screen.getAllByRole('slider', { name: 'Step' })[index] as HTMLElement
  act(() => {
    fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
  })
}

describe('the simplification pipeline', () => {
  it('runs all four stages in the safe order on Exercise 7.1.2 and ends in CNF', async () => {
    render(<SimplifyPipeline />)
    await settle()

    const stages = within(screen.getByRole('list', { name: 'Pipeline stages' })).getAllByRole('button')
    expect(stages.map((b) => b.textContent)).toEqual([
      '1. Eliminate ε-productions ✓',
      '2. Eliminate unit productions ✓',
      '3. Eliminate useless symbols ✓',
      '4. Chomsky Normal Form ✓',
    ])

    const result = screen.getByRole('region', { name: 'Pipeline result' })
    expect(result.textContent).toContain('In Chomsky Normal Form')
    expect(result.textContent).toContain('except for ε')
  })

  it('diffs the grammar at each stage and narrates the step', async () => {
    const user = userEvent.setup()
    render(<SimplifyPipeline />)
    await settle()

    await user.click(screen.getByRole('button', { name: /Example 7.8/ }))
    await settle()

    const diff = screen.getByLabelText('Before and after')
    expect(diff.textContent).toContain('2 removed')
    expect(within(diff).getAllByText(/A → a A A|A → ε/).length).toBeGreaterThan(0)

    scrubToEnd()
    expect(screen.getByText(/generates L\(G\) − \{ε\}/)).toBeDefined()
  })

  it('the wrong-order demo visibly leaves a useless symbol behind', async () => {
    const user = userEvent.setup()
    render(<SimplifyPipeline />)
    await settle()

    await user.click(screen.getByRole('button', { name: /Example 7.1 \(useless symbols\)/ }))
    await settle()
    await user.click(screen.getByRole('button', { name: /3\. Eliminate useless symbols/ }))
    await user.click(screen.getByRole('button', { name: /try reachability first/i }))

    const demo = screen.getByRole('status')
    expect(demo.textContent).toContain('leaves A, b behind')
    expect(within(demo).getByText('A → b')).toBeDefined()
  })

  it('refuses CNF-stage nonsense honestly: an empty language stops the pipeline', async () => {
    const user = userEvent.setup()
    render(<SimplifyPipeline />)
    await settle()

    const box = screen.getByRole('textbox', { name: /grammar/i })
    await user.clear(box)
    await user.type(box, 'S -> S a')
    await settle()

    const stages = within(screen.getByRole('list', { name: 'Pipeline stages' })).getAllByRole('button')
    expect(stages[2]?.textContent).toContain('✗')
    await user.click(stages[2] as HTMLElement)
    expect(screen.getByRole('alert').textContent).toContain('L(G) is empty')
  })

  it('teaches the safe order', async () => {
    render(<SimplifyPipeline />)
    await settle()
    const docs = screen.getByRole('region', { name: 'The safe order' })
    expect(docs.textContent).toContain('ε-productions, then unit productions, then useless symbols')
    expect(docs.textContent).toContain('Theorem 7.2')
  })
})

describe('the CFL closure lab', () => {
  it('unions two grammars with a fresh start symbol and shows the sample', async () => {
    render(<CflClosureLab />)

    scrubToEnd()
    expect(screen.getByText(/chooses a side/)).toBeDefined()
    const sample = screen.getByRole('region', { name: 'Result sample' })
    expect(sample.textContent).toContain('ab')
    expect(sample.textContent).toContain('b  bb')
  })

  it('intersects with a regular language and runs the product', async () => {
    const user = userEvent.setup()
    render(<CflClosureLab />)

    await user.click(screen.getByRole('button', { name: /intersection with a regular language/i }))
    scrubToEnd()
    expect(screen.getByText(/L ∩ R/)).toBeDefined()

    const agreement = screen.getByRole('region', { name: 'Agreement' })
    const row = within(agreement).getByText('aabb').closest('tr') as HTMLElement
    expect(row.textContent).toContain('accepts · DFA accepts')
    expect(within(row).getAllByText(/accepts/).length).toBeGreaterThan(0)

    // The product is a real machine: run it.
    const runner = screen.getByRole('region', { name: 'Run the result' })
    await user.type(within(runner).getByRole('textbox'), 'aabb')
    await user.click(within(runner).getByRole('button', { name: /^run$/i }))
    expect(screen.getByText('Accepted')).toBeDefined()
  })

  it('builds the inverse-homomorphism buffer machine from a typed h', async () => {
    const user = userEvent.setup()
    render(<CflClosureLab />)

    await user.click(screen.getByRole('button', { name: /inverse homomorphism/i }))
    expect(screen.getByText(/buffer x holding the unread tail/)).toBeDefined()

    const agreement = screen.getByRole('region', { name: 'Agreement' })
    const row = within(agreement).getByText('xy').closest('tr') as HTMLElement
    expect(row.textContent).toContain('h(w) = abaabb: rejects')
    expect(row.textContent).toContain('rejects')
  })

  it('shows the non-closure with the book’s two grammars and links to the pumping game', () => {
    render(<CflClosureLab />)
    const card = screen.getByRole('region', { name: 'Not closed under intersection' })
    expect(card.textContent).toContain('L₁ ∩ L₂ = {aⁿbⁿcⁿ | n ≥ 1}')
    expect(within(card).getByRole('link', { name: /pumping game/i }).getAttribute('href')).toContain('/prove/pumping/abc-equal')
  })

  it('lists the undecidable questions and claims nothing about them', () => {
    render(<CflClosureLab />)
    const card = screen.getByRole('region', { name: 'What cannot be decided' })
    expect(card.textContent).toContain('Is G ambiguous?')
    expect(card.textContent).toContain('never "unambiguous"')
    expect(card.textContent).toContain('undecidable')
    expect(card.textContent).toContain('does not pretend to')
  })
})
