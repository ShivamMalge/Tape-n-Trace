/**
 * The Module 5 Turing-machine pages, driven as a student would — phases.md P1.6.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TM_PRESETS, isOk, unwrap } from '@tape-n-trace/engine'
import { TmWorkbench } from '../components/tm-workbench'
import { TmEditor } from '../components/tm-editor'
import { TmReductionWorkbench } from '../components/tm-reduction-workbench'
import { parseTmText, tmToText } from '../lib/tm-text'
import { tmEdgeLabel } from '../lib/tm-drawable'

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

describe('the text form', () => {
  it('round-trips every single-symbol gallery machine', () => {
    for (const p of TM_PRESETS.filter((q) => q.encodeInput === undefined)) {
      const m = p.machine
      const back = unwrap(
        parseTmText(tmToText(m), { start: m.start, accepting: m.accepting, blank: m.blank, inputAlphabet: m.inputAlphabet }),
      )
      expect(new Set(back.transitions.map((t) => t.id)), p.id).toEqual(new Set(m.transitions.map((t) => t.id)))
      expect(back.tapes).toBe(m.tapes)
      expect(new Set(back.states)).toEqual(new Set(m.states))
    }
  })

  it('reports every bad line at once, positioned', () => {
    const result = parseTmText('q0 0 q1 X R\nq0, 0 -> q1, X, U', { start: 'q0', accepting: [], blank: 'B', inputAlphabet: ['0'] })
    expect(isOk(result)).toBe(false)
    if (isOk(result)) return
    expect(result.errors.map((e) => e.code)).toEqual(['TM_LINE_NO_ARROW', 'TM_LINE_BAD_MOVE'])
    expect(result.errors[1]?.position).toBe(12)
  })

  it('labels an arc the way the book draws it', () => {
    const first = (TM_PRESETS[0]?.machine.transitions[0]) as NonNullable<(typeof TM_PRESETS)[0]>['machine']['transitions'][0]
    expect(tmEdgeLabel(first)).toBe('0/X →')
  })
})

describe('the simulator', () => {
  it('runs Example 8.2 on 0011 and writes the textbook ID sequence', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)

    await user.click(screen.getByRole('button', { name: '0011' }))
    expect(screen.getByText('Accepted')).toBeDefined()
    const log = screen.getByRole('region', { name: 'ID sequence' })
    expect(log.textContent).toContain(
      'q₀0011 ⊢ Xq₁011 ⊢ X0q₁11 ⊢ Xq₂0Y1 ⊢ q₂X0Y1 ⊢ Xq₀0Y1 ⊢ XXq₁Y1 ⊢ XXYq₁1 ⊢ XXq₂YY ⊢ Xq₂XYY ⊢ XXq₀YY ⊢ XXYq₃Y ⊢ XXYYq₃B ⊢ XXYYBq₄B',
    )

    scrubToEnd()
    const tape = screen.getByRole('region', { name: 'Tape' })
    expect(tape.textContent).toContain('move 13')
    expect(within(tape).getByRole('group', { name: /head on cell 5 reading B, in state q4/ })).toBeDefined()
  })

  it('offers both tape conventions', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)
    await user.click(screen.getByRole('button', { name: '0011' }))

    const tapeFixed = screen.getByRole('radio', { name: /tape fixed/i })
    await user.click(tapeFixed)
    expect((tapeFixed as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('group', { name: /head on cell 0/ })).toBeDefined()
  })

  it('stops the non-halting machine at the cap and continues on request', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)

    await user.click(screen.getByRole('button', { name: /A machine that does not halt/ }))
    expect(screen.getByRole('note').textContent).toContain('Does not halt')

    await user.click(screen.getByRole('button', { name: '1' }))
    const status = screen.getByRole('status', { name: 'Move cap' })
    expect(status.textContent).toContain('Stopped after 1000 moves')
    expect(screen.queryByText('Rejected')).toBeNull()

    await user.click(screen.getByRole('button', { name: /continue for 1000 more moves/i }))
    expect(screen.getByRole('status', { name: 'Move cap' }).textContent).toContain('Stopped after 2000 moves')
  }, 30_000)

  it('draws the branch tree for the nondeterministic machine', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)
    await user.click(screen.getByRole('button', { name: /nondeterministic machine/ }))
    await user.click(screen.getByRole('button', { name: '01' }))
    expect(screen.getByRole('group', { name: /Branch tree for 01/ })).toBeDefined()
  })

  it('runs the two-track machine from a plain typed string', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)
    await user.click(screen.getByRole('button', { name: /Multiple tracks/ }))
    await user.click(screen.getByRole('button', { name: '01c01' }))
    expect(screen.getByText('Accepted')).toBeDefined()
  })
})

describe('the editor', () => {
  it('opens on Fig. 8.9, deterministic, and runs in place', async () => {
    const user = userEvent.setup()
    render(<TmEditor />)
    await settle()

    expect(screen.getByRole('status').textContent).toContain('deterministic.')
    const region = screen.getByRole('region', { name: /run it/i })
    await user.type(within(region).getByRole('textbox'), '0011')
    await user.click(within(region).getByRole('button', { name: /^run$/i }))
    expect(screen.getByText('Accepted')).toBeDefined()
  })

  it('reports a malformed line, and a stationary single-tape head', async () => {
    const user = userEvent.setup()
    render(<TmEditor />)

    const box = screen.getByRole('textbox', { name: /moves/i })
    await user.clear(box)
    await user.type(box, 'q0, 0 -> q1, 0, S')
    await settle()
    expect(screen.getByRole('alert').textContent).toContain('must move left or right')
  })
})

describe('many tapes to one', () => {
  it('counts the moves of M and N side by side', async () => {
    const user = userEvent.setup()
    render(<TmReductionWorkbench />)

    await user.click(screen.getByRole('button', { name: /run both/i }))
    scrubToEnd()

    const counters = screen.getByRole('region', { name: 'Running time' })
    expect(within(counters).getByText('6')).toBeDefined()
    const n = Number((counters.querySelector('[data-counter="Moves of N"]') as HTMLElement).textContent)
    expect(n).toBeGreaterThan(6)
    expect(screen.getByRole('status').textContent).toContain('Theorem 8.10')
    expect(screen.getByRole('region', { name: 'N' }).textContent).toContain('▲')
  })
})
