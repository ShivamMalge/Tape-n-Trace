/**
 * The Module 5 undecidability pages, driven as a student would — phases.md P1.7.
 *
 * The criterion these exist for is the negative one: "No page in this section
 * claims to simulate an undecidable problem." That is checked here in the two
 * places it could go wrong — a cell whose run outlived its budget must never be
 * reported as a rejection, and the assumed decider of Fig. 8.7 must be drawn as
 * assumed and then withdrawn.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  FIRST_ACCEPTING_CODE_INDEX,
  FIRST_CODE_INDEX,
  FIRST_NON_HALTING_CODE_INDEX,
  LANGUAGE_CLASSES,
} from '@tape-n-trace/engine'
import { DiagonalWorkbench } from '../components/diagonal-workbench'
import { ReductionBuilder } from '../components/reduction-builder'
import { HierarchyRings } from '../components/hierarchy-rings'
import { ClosureTable, ComplementPlacements } from '../components/recursive-re-tables'
import { SyllabusBreadcrumb } from '../components/syllabus-breadcrumb'

const pathname = vi.hoisted(() => ({ current: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

afterEach(cleanup)

/** Class titles hold brackets, so a name matcher built from one has to escape them. */
const literal = (text: string): RegExp => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

const grid = (): HTMLElement => screen.getByRole('table')
const cellButtons = (): HTMLElement[] => within(grid()).getAllByRole('button')

function choosePreset(label: RegExp): void {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: label }))
  })
}

describe('the diagonalization table', () => {
  it('opens on the top of the table, which is solid 0s — the footnote to Fig. 9.1', () => {
    render(<DiagonalWorkbench />)
    const digits = cellButtons().map((b) => b.textContent)
    expect(digits.length).toBe(144)
    expect(new Set(digits)).toEqual(new Set(['0']))
  })

  it('shows the first row with a 1 in it where the engine says it is', () => {
    render(<DiagonalWorkbench />)
    choosePreset(new RegExp(`first machine that accepts \\(row ${FIRST_ACCEPTING_CODE_INDEX}\\)`))
    const firstRow = within(grid()).getAllByRole('row')[1] as HTMLElement
    expect(within(firstRow).getAllByRole('button').map((b) => b.textContent)).toContain('1')
  })

  it('reports a cell whose run outlived the budget as unanswered, never as a rejection', () => {
    render(<DiagonalWorkbench />)
    choosePreset(new RegExp(`never halts \\(row ${FIRST_NON_HALTING_CODE_INDEX}\\)`))

    const unknown = cellButtons().filter((b) => b.textContent === '?')
    expect(unknown.length).toBeGreaterThan(0)
    for (const button of unknown) {
      const label = button.getAttribute('aria-label') ?? ''
      expect(label).toMatch(/no answer within the budget/)
      expect(label).not.toMatch(/does not accept/)
    }
  })

  it('explains an unanswered cell by pointing at the chapter, not by guessing', async () => {
    const user = userEvent.setup()
    render(<DiagonalWorkbench />)
    choosePreset(new RegExp(`never halts \\(row ${FIRST_NON_HALTING_CODE_INDEX}\\)`))
    await user.click(cellButtons().find((b) => b.textContent === '?') as HTMLElement)
    expect(screen.getByText(/has no algorithm/)).toBeTruthy()
    expect(screen.getByText(/says nothing rather than guessing/)).toBeTruthy()
  })

  it('opens a cell into the machine its row codes and the string its column names', async () => {
    const user = userEvent.setup()
    render(<DiagonalWorkbench />)
    choosePreset(new RegExp(`first real code \\(row ${FIRST_CODE_INDEX}\\)`))
    await user.click(cellButtons()[0] as HTMLElement)

    expect(screen.getByRole('heading', { name: new RegExp(`Row ${FIRST_CODE_INDEX}`) })).toBeTruthy()
    expect(screen.getByText(/δ\(q₁, X₁\) = \(q₁, X₁, D₁\)/)).toBeTruthy()
    expect(screen.getByText(/read the result as a binary integer/)).toBeTruthy()
  })

  it('says why an ill-formed string is still a machine', async () => {
    const user = userEvent.setup()
    render(<DiagonalWorkbench />)
    await user.click(cellButtons()[0] as HTMLElement)
    expect(screen.getByText(/Not a well-formed code/)).toBeTruthy()
    expect(screen.getByText(/one state and no\s+transitions/)).toBeTruthy()
  })

  it('complements the diagonal into a row of its own', async () => {
    const user = userEvent.setup()
    render(<DiagonalWorkbench />)
    choosePreset(/The diagonal itself/)
    expect(within(grid()).queryByRole('rowheader', { name: 'L_d' })).toBeNull()
    await user.click(screen.getByLabelText(/Complement the diagonal/))
    expect(within(grid()).getByRole('rowheader', { name: 'L_d' })).toBeTruthy()
  })

  it('says when the diagonal is off screen instead of drawing one that is not there', () => {
    render(<DiagonalWorkbench />)
    // The interesting rows start far out while the legible columns are short
    // strings, so those presets deliberately leave the axes unaligned.
    choosePreset(new RegExp(`first machine that accepts \\(row ${FIRST_ACCEPTING_CODE_INDEX}\\)`))
    expect(screen.getByText(/the diagonal is off screen/)).toBeTruthy()
    choosePreset(/The diagonal itself/)
    expect(screen.queryByText(/the diagonal is off screen/)).toBeNull()
  })

  it('walks Theorem 9.2 and ends on it', async () => {
    const user = userEvent.setup()
    render(<DiagonalWorkbench />)
    choosePreset(/The diagonal itself/)
    await user.click(screen.getByRole('button', { name: /Walk Theorem 9.2/ }))

    const slider = screen.getByRole('slider', { name: 'Step' })
    act(() => {
      fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
    })
    expect(screen.getByText(/not a recursively enumerable language/)).toBeTruthy()
    expect(screen.getByText(/Hopcroft 2e, §9.1.4, Thm 9.2/)).toBeTruthy()
  })
})

describe('the reduction builder', () => {
  it('opens on Example 8.1 and walks it to the contradiction', async () => {
    const user = userEvent.setup()
    render(<ReductionBuilder />)
    expect(screen.getByText(/if there were an algorithm for the calls-foo problem/)).toBeTruthy()

    const slider = screen.getByRole('slider', { name: 'Step' })
    act(() => {
      fireEvent.change(slider, { target: { value: slider.getAttribute('max') ?? '0' } })
    })
    expect(screen.getByText(/That is the contradiction/)).toBeTruthy()
    expect(screen.getByText(/It does not: the chain would decide/)).toBeTruthy()
    await user.click(screen.getAllByRole('radio', { name: /halting problem/ })[1] as HTMLElement)
    expect(screen.getByText(/if there were an algorithm for the halting problem/)).toBeTruthy()
  })

  it('draws the assumed decider as assumed', () => {
    render(<ReductionBuilder />)
    expect(screen.getByText(/The dashed box is the algorithm assumed to exist/)).toBeTruthy()
  })

  it('refuses a reduction that runs the wrong way, and gives the reason', async () => {
    const user = userEvent.setup()
    render(<ReductionBuilder />)
    await user.click(screen.getAllByRole('radio', { name: /Membership in a regular language/ })[0] as HTMLElement)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(/true, and useless/)).toBeTruthy()
    expect(within(alert).getByText(/p\. 316/)).toBeTruthy()
    expect(screen.queryByRole('slider', { name: 'Step' })).toBeNull()
  })

  it('refuses to invent a construction it does not carry', async () => {
    const user = userEvent.setup()
    render(<ReductionBuilder />)
    await user.click(screen.getAllByRole('radio', { name: /diagonalization language/ })[1] as HTMLElement)
    expect(within(screen.getByRole('alert')).getByText(/carry no reduction from/)).toBeTruthy()
  })

  it('marks the problem no reduction may start from', () => {
    render(<ReductionBuilder />)
    expect(screen.getByText(/no reduction may start here/)).toBeTruthy()
  })
})

describe('the hierarchy rings', () => {
  it('nests every class, outermost first', () => {
    render(<HierarchyRings show={LANGUAGE_CLASSES.map((c) => c.id)} caption="test" />)
    for (const cls of LANGUAGE_CLASSES) {
      expect(screen.getByRole('button', { name: literal(cls.title) }), cls.id).toBeTruthy()
    }
  })

  it('claims no section for the class the prescribed sections do not carry', async () => {
    const user = userEvent.setup()
    render(<HierarchyRings show={LANGUAGE_CLASSES.map((c) => c.id)} caption="test" />)
    const csl = screen.getByRole('button', { name: /Context-sensitive/ })
    expect(csl.textContent).toMatch(/outside the prescribed sections/)
    await user.click(csl)
    expect(screen.getByText(/no section is cited for it/)).toBeTruthy()
  })

  it('admits the separation it cannot witness', () => {
    render(<HierarchyRings show={LANGUAGE_CLASSES.map((c) => c.id)} caption="test" />)
    expect(screen.getByText(/Nothing is plotted here/)).toBeTruthy()
  })

  it('opens a ring into its machine, closure and pumping lemma', async () => {
    const user = userEvent.setup()
    render(<HierarchyRings show={LANGUAGE_CLASSES.map((c) => c.id)} caption="test" />)
    await user.click(screen.getByRole('button', { name: /Context-free/ }))
    expect(screen.getByText(/A pushdown automaton/)).toBeTruthy()
    expect(screen.getByText(/Theorem 7.18/)).toBeTruthy()
  })

  it('folds omitted classes into the innermost ring shown, so Fig. 9.2 loses nothing', () => {
    render(<HierarchyRings show={['recursive', 're', 'all']} caption="test" />)
    // 0ⁿ1ⁿ is context-free, and with the inner rings hidden it is still recursive.
    expect(screen.getByText(/0ⁿ1ⁿ/)).toBeTruthy()
    expect(screen.getByText(/L_d = /)).toBeTruthy()
  })
})

describe('the §9.2 tables', () => {
  it('labels the exercise answers as exercise answers', async () => {
    const user = userEvent.setup()
    render(<ClosureTable />)
    await user.click(screen.getByRole('button', { name: /^Union, recursive:/ }))
    expect(screen.getByText(/sets this as an exercise and prints no answer/)).toBeTruthy()
  })

  it('cites the theorem for the one row the book proves', async () => {
    const user = userEvent.setup()
    render(<ClosureTable />)
    await user.click(screen.getByRole('button', { name: /^Complement, recursive:/ }))
    expect(screen.getByText(/Theorem 9.3/)).toBeTruthy()
    expect(screen.getByText(/proved in the text/)).toBeTruthy()
  })

  it('reports the RE languages as not closed under complement, with the witness', async () => {
    const user = userEvent.setup()
    render(<ClosureTable />)
    await user.click(screen.getByRole('button', { name: /Complement, recursively enumerable/ }))
    expect(screen.getByText(/The RE languages are not closed under complement\./)).toBeTruthy()
    expect(screen.getByText(/complement of L_u is RE for no machine at all/)).toBeTruthy()
  })

  it('leaves exactly four of the nine placements possible', () => {
    render(<ComplementPlacements />)
    expect(screen.getAllByText('possible')).toHaveLength(4)
    expect(screen.getAllByText('impossible')).toHaveLength(5)
  })
})

describe('the breadcrumb', () => {
  it('names the module, the topic and the sections from the path alone', () => {
    pathname.current = '/simulate/tm'
    render(<SyllabusBreadcrumb />)
    const nav = screen.getByRole('navigation', { name: 'Syllabus' })
    expect(nav.textContent).toMatch(/Module 5/)
    expect(nav.textContent).toMatch(/Turing machines/)
    expect(nav.textContent).toMatch(/§8.2/)
    expect(nav.textContent).toMatch(/CO5/)
  })

  it('renders nothing on a page the scheme does not place', () => {
    pathname.current = '/'
    const { container } = render(<SyllabusBreadcrumb />)
    expect(container.innerHTML).toBe('')
  })

  it('joins the topics that share a page', () => {
    pathname.current = '/simulate'
    render(<SyllabusBreadcrumb />)
    const nav = screen.getByRole('navigation', { name: 'Syllabus' })
    expect(nav.textContent).toMatch(/Deterministic finite automata/)
    expect(nav.textContent).toMatch(/ε-NFAs/)
    expect(nav.textContent).toMatch(/Module 1/)
  })
})
