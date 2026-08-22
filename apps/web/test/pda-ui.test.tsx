/**
 * The Module 3 PDA pages, driven as a student would — phases.md P1.4.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { isOk, pdaPreset, unwrap } from '@tape-n-trace/engine'
import { PdaWorkbench } from '../components/pda-workbench'
import { PdaEditor } from '../components/pda-editor'
import { PdaAcceptanceWorkbench } from '../components/pda-acceptance-workbench'
import { CfgToPdaWorkbench } from '../components/cfg-to-pda-workbench'
import { parsePdaText, pdaToText, splitPush } from '../lib/pda-text'
import { pdaEdgeLabel } from '../lib/pda-drawable'

afterEach(cleanup)

/** Let a debounced input settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350))
  })
}

/** Scrub a step slider to its last step — the first on the page unless told otherwise. */
function scrubToEnd(index = 0): void {
  const slider = screen.getAllByRole('slider', { name: 'Step' })[index] as HTMLElement
  act(() => {
    fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
  })
}

describe('the PDA text form', () => {
  it('round-trips every gallery machine', () => {
    for (const id of ['anbn', 'wwr', 'wcwr', 'balanced-parens']) {
      const machine = (pdaPreset(id) as NonNullable<ReturnType<typeof pdaPreset>>).machine
      const back = unwrap(
        parsePdaText(pdaToText(machine), {
          start: machine.start,
          startStack: machine.startStack,
          accepting: machine.accepting,
          acceptBy: machine.acceptBy,
        }),
      )
      expect(new Set(back.transitions.map((t) => t.id)), id).toEqual(new Set(machine.transitions.map((t) => t.id)))
      expect(new Set(back.states)).toEqual(new Set(machine.states))
      expect(back.acceptBy).toBe(machine.acceptBy)
    }
  })

  it('splits pushed strings by the letter-plus-digits convention, spaces winning', () => {
    expect(splitPush('AZ0')).toEqual(['A', 'Z0'])
    expect(splitPush('XX')).toEqual(['X', 'X'])
    expect(splitPush('0Z0')).toEqual(['0', 'Z0'])
    expect(splitPush('A Z0')).toEqual(['A', 'Z0'])
    expect(splitPush('ε')).toEqual([])
    expect(splitPush('eps')).toEqual([])
  })

  it('reports every bad line at once, with positions', () => {
    const result = parsePdaText('q0 a Z0 q0\nq0, a -> q1', {
      start: 'q0',
      startStack: 'Z0',
      accepting: [],
      acceptBy: 'finalState',
    })
    expect(isOk(result)).toBe(false)
    if (isOk(result)) return
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]?.code).toBe('PDA_LINE_NO_ARROW')
    expect(result.errors[0]?.position).toBe(0)
    expect(result.errors[1]?.code).toBe('PDA_LINE_BAD_LHS')
    expect(result.errors[1]?.position).toBe(11)
  })

  it('labels an arc the way the book writes it', () => {
    const machine = (pdaPreset('anbn') as NonNullable<ReturnType<typeof pdaPreset>>).machine
    const first = machine.transitions[0] as (typeof machine.transitions)[number]
    expect(pdaEdgeLabel(first)).toBe('a, Z0/AZ0')
  })
})

describe('the PDA simulator', () => {
  it('runs aaabbb and shows the exact textbook ID sequence, copy-pasteable', async () => {
    const user = userEvent.setup()
    render(<PdaWorkbench />)

    await user.click(screen.getByRole('button', { name: 'aaabbb' }))

    expect(screen.getByText('Accepted')).toBeDefined()
    const log = screen.getByRole('region', { name: 'ID sequence' })
    expect(log.textContent).toContain(
      '(q0, aaabbb, Z0) ⊢ (q0, aabbb, AZ0) ⊢ (q0, abbb, AAZ0) ⊢ (q0, bbb, AAAZ0) ⊢ ' +
        '(q1, bb, AAZ0) ⊢ (q1, b, AZ0) ⊢ (q1, ε, Z0) ⊢ (q2, ε, Z0)',
    )
  })

  it('keeps the three ID panels in sync with the step being expanded', async () => {
    const user = userEvent.setup()
    render(<PdaWorkbench />)

    await user.click(screen.getByRole('button', { name: 'ab' }))
    scrubToEnd()

    const panel = screen.getByRole('region', { name: 'Current instantaneous description' })
    expect(within(panel).getByText('q2')).toBeDefined()
    expect(within(panel).getByRole('img', { name: /Stack, top first: Z0/ })).toBeDefined()
    expect(panel.textContent).toContain('(q2, ε, Z0)')
  })

  it('draws the branch tree for wwᴿ with wrong guesses flagged where they died', async () => {
    const user = userEvent.setup()
    render(<PdaWorkbench />)

    await user.click(screen.getByRole('button', { name: /wwᴿ — even palindromes/ }))
    await user.click(screen.getByRole('button', { name: '0110' }))
    scrubToEnd()

    expect(screen.getByText('Accepted')).toBeDefined()
    const tree = screen.getByRole('group', { name: /Branch tree for 0110/ })
    expect(tree.getAttribute('aria-label')).toMatch(/\d+ dead/)
    expect(within(tree).getAllByText(/died @\d+/).length).toBeGreaterThan(0)
  })

  it('reports an off-alphabet input instead of running', async () => {
    const user = userEvent.setup()
    render(<PdaWorkbench />)

    await user.type(screen.getByRole('textbox'), 'abc')
    await user.click(screen.getByRole('button', { name: /^run$/i }))

    expect(screen.getByRole('alert').textContent).toContain('"c"')
  })
})

describe('the PDA editor', () => {
  it('opens nondeterministic and names the overlapping pairs', async () => {
    render(<PdaEditor />)
    await settle()

    const report = screen.getByRole('status')
    expect(report.textContent).toContain('Not deterministic')
    expect(report.textContent).toContain('ε-move')
  })

  it('calls wcwᴿ a DPDA', async () => {
    const user = userEvent.setup()
    render(<PdaEditor />)

    await user.click(screen.getByRole('button', { name: /wcwᴿ — palindromes with a centre mark/ }))
    await settle()

    expect(screen.getByRole('status').textContent).toContain('Deterministic')
  })

  it('shows parse errors for a malformed line, positioned', async () => {
    const user = userEvent.setup()
    render(<PdaEditor />)

    const box = screen.getByRole('textbox', { name: /transitions/i })
    await user.clear(box)
    await user.type(box, 'q0 a Z0 q0')
    await settle()

    expect(screen.getByRole('alert').textContent).toContain('no "->"')
  })

  it('runs the edited machine in place', async () => {
    const user = userEvent.setup()
    render(<PdaEditor />)
    await settle()

    const runBox = within(screen.getByRole('region', { name: /run it/i })).getByRole('textbox')
    await user.type(runBox, 'aabb')
    await user.click(within(screen.getByRole('region', { name: /run it/i })).getByRole('button', { name: /^run$/i }))

    expect(screen.getByText('Accepted')).toBeDefined()
  })
})

describe('the acceptance-mode conversions', () => {
  it('final → empty: narrates the bottom marker and ends with N(P′) = L(P)', () => {
    render(<PdaAcceptanceWorkbench />)

    scrubToEnd()
    expect(screen.getByText(/N\(P′\) = L\(P\)/)).toBeDefined()

    const table = screen.getByRole('region', { name: 'Sample agreement' })
    const row = within(table).getByText('aaabbb').closest('tr') as HTMLElement
    expect(within(row).getAllByText('accepts')).toHaveLength(2)
    const bad = within(table).getByText('ba').closest('tr') as HTMLElement
    expect(within(bad).getAllByText('rejects')).toHaveLength(2)
  })

  it('empty → final: offers exactly the empty-stack machines', async () => {
    const user = userEvent.setup()
    render(<PdaAcceptanceWorkbench />)

    await user.click(screen.getByRole('button', { name: /empty stack → final state/i }))

    expect(screen.getByRole('button', { name: /balanced parentheses/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /aⁿbⁿ — the matched count/ })).toBeNull()

    scrubToEnd()
    expect(screen.getByText(/L\(P′\) = N\(P\)/)).toBeDefined()
  })
})

describe('grammar → PDA', () => {
  it('builds the one-state machine from aⁿbⁿ and runs it', async () => {
    const user = userEvent.setup()
    render(<CfgToPdaWorkbench />)
    await settle()

    scrubToEnd()
    expect(screen.getByText(/N\(P\) = L\(G\)/)).toBeDefined()
    expect(screen.getByText('The one-state PDA')).toBeDefined()

    // The built machine really runs: a generated string is offered and accepted.
    const runner = screen.getByRole('region', { name: /run the machine it built/i })
    await user.click(within(runner).getByRole('button', { name: 'aabb' }))
    expect(screen.getByText('Accepted')).toBeDefined()

    const log = screen.getByRole('region', { name: 'ID sequence' })
    expect(log.textContent).toContain('(q, aabb, S)')
  })
})
