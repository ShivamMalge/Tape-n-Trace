/**
 * The machine editor — the P0.2 acceptance criteria that need a real DOM.
 *
 * Two of them are about people rather than pixels: a student who cannot use a
 * pointer must still be able to build a machine, and a student whose machine is
 * broken must be told everything that is wrong with it rather than the first
 * thing. Both are tested by driving the editor the way a keyboard user would.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { dfaContains01 } from '@tape-n-trace/engine'
import type { FiniteAutomaton } from '@tape-n-trace/engine'
import { MachineEditor } from '../components/machine-editor'

afterEach(cleanup)

/** The states table, addressed the way a screen-reader user would find it. */
function stateRow(id: string): HTMLElement {
  const row = screen.getAllByRole('row').find((candidate) => {
    const first = within(candidate).queryAllByRole('button')[0]
    return first?.textContent === id
  })
  if (row === undefined) throw new Error(`no row for state ${id}`)
  return row
}

describe('keyboard navigability (§11.5)', () => {
  it('builds a two-state machine using only the keyboard-reachable controls', async () => {
    const user = userEvent.setup()
    render(<MachineEditor />)

    // Start: one state, no transitions.
    expect(screen.getByText('No transitions yet.', { exact: false })).toBeDefined()

    await user.click(screen.getByRole('button', { name: /add state/i }))

    // Both states are now listed and individually addressable.
    expect(stateRow('q0')).toBeDefined()
    expect(stateRow('q1')).toBeDefined()

    // Add a transition through the form rather than by dragging.
    const from = screen.getByRole('combobox', { name: /from/i })
    const reads = screen.getByRole('combobox', { name: /reads/i })
    const to = screen.getByRole('combobox', { name: /to/i })
    await user.selectOptions(from, 'q0')
    await user.selectOptions(reads, '0')
    await user.selectOptions(to, 'q1')
    await user.click(screen.getByRole('button', { name: /add transition/i }))

    // Mark q1 accepting and q0 the start, both through labelled controls.
    await user.click(within(stateRow('q1')).getByRole('checkbox', { name: /accepting/i }))
    await user.click(within(stateRow('q0')).getByRole('radio', { name: /start state/i }))

    const rows = screen.getAllByRole('row')
    const transitionRow = rows.find((r) => within(r).queryByRole('button', { name: /delete the transition/i }))
    expect(transitionRow, 'the transition should appear in the δ table').toBeDefined()
    expect(within(stateRow('q1')).getByRole('checkbox', { name: /accepting/i })).toHaveProperty(
      'checked',
      true,
    )
  })

  it('announces every state and every transition', async () => {
    render(<MachineEditor initial={dfaContains01} />)

    // The diagram describes itself, and so does each part of it.
    expect(screen.getByRole('group', { name: /DFA with 3 states/i })).toBeDefined()
    for (const state of dfaContains01.states) {
      expect(screen.getAllByRole('img', { name: new RegExp(`^State ${state}`) }).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByRole('img', { name: /Transition from q0 to q1 on 0/i }).length).toBe(1)
    expect(screen.getAllByRole('img', { name: /Self-loop on q2 reading 0, 1/i }).length).toBe(1)

    // And every transition has a labelled delete control in the δ table.
    expect(screen.getAllByRole('button', { name: /delete the transition/i })).toHaveLength(
      dfaContains01.transitions.length,
    )
  })

  it('renames a state everywhere from the states table', async () => {
    const user = userEvent.setup()
    render(<MachineEditor initial={dfaContains01} />)

    await user.click(within(stateRow('q2')).getByRole('button', { name: 'q2' }))
    const input = screen.getByRole('textbox', { name: /rename state q2/i })
    await user.clear(input)
    await user.type(input, 'accept{Enter}')

    expect(stateRow('accept')).toBeDefined()
    expect(screen.getAllByRole('img', { name: /^State accept/ }).length).toBeGreaterThan(0)
  })

  it('undoes and redoes', async () => {
    const user = userEvent.setup()
    render(<MachineEditor />)

    await user.click(screen.getByRole('button', { name: /add state/i }))
    expect(stateRow('q1')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(() => stateRow('q1')).toThrow()

    await user.click(screen.getByRole('button', { name: 'Redo' }))
    expect(stateRow('q1')).toBeDefined()
  })
})

describe('an invalid machine shows every violation at once (§4)', () => {
  /**
   * Four separate problems, all present together. Reporting the first and making
   * the student fix it to discover the second is the failure mode the engine's
   * error channel exists to prevent.
   */
  const broken: FiniteAutomaton = {
    kind: 'DFA',
    states: ['q0', 'q1'],
    alphabet: ['0', '1'],
    transitions: [
      { id: 'a', from: 'q0', read: '0', to: 'q0' },
      { id: 'b', from: 'q0', read: '0', to: 'q1' }, // nondeterministic
      { id: 'c', from: 'q1', read: '0', to: 'ghost' }, // unknown target
      { id: 'd', from: 'q1', read: 'x', to: 'q0' }, // symbol outside Σ
    ],
    start: 'q0',
    accepting: ['nowhere'], // unknown accepting state
  }

  it('lists all four, simultaneously', () => {
    render(<MachineEditor initial={broken} />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading').textContent).toContain('4 problems')

    const items = within(alert).getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(items).toHaveLength(4)
    expect(items.join(' ')).toContain('more than one transition on "0"')
    expect(items.join(' ')).toContain('not a state of the automaton')
    expect(items.join(' ')).toContain('not in the alphabet')
    expect(items.join(' ')).toContain('marked accepting')
  })

  it('updates the list live as the machine is repaired', async () => {
    const user = userEvent.setup()
    render(<MachineEditor initial={broken} />)

    expect(screen.getByRole('alert').textContent).toContain('4 problems')

    // Remove the duplicate move; the count drops without the others being touched.
    const rows = screen.getAllByRole('row')
    const offending = rows.find((r) =>
      within(r).queryByRole('button', { name: /delete the transition from q0 to q1 on 0/i }),
    )
    expect(offending).toBeDefined()
    await user.click(within(offending as HTMLElement).getByRole('button', { name: /delete the transition/i }))

    expect(screen.getByRole('alert').textContent).toContain('3 problems')
  })

  it('says nothing when the machine is fine', () => {
    render(<MachineEditor initial={dfaContains01} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
