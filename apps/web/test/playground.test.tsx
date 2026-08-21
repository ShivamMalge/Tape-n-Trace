/**
 * The RE playground, the closure lab, text search and the applied cases.
 *
 * The criterion worth the most here is panel sync. Four views of one expression
 * are only useful if they are always views of the *same* expression, and a
 * student comparing a parse tree against a machine has no way to notice that
 * they have drifted apart.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { APPLIED, appliedCase } from '@tape-n-trace/engine'
import { buildPlayground } from '../lib/playground'
import { RegexPlayground } from '../components/regex-playground'
import { ClosureLab } from '../components/closure-lab'
import { TextSearch } from '../components/text-search'

afterEach(cleanup)

describe('buildPlayground — one expression, four panels', () => {
  /**
   * phases.md P0.4 — all four panels stay in sync.
   *
   * They are derived by one call from one string, so "in sync" is a property of
   * the data rather than of the rendering: every panel in a result describes the
   * expression that result was built from. This checks the panels agree with
   * each other, which is the thing a stale render would break.
   */
  it('every panel describes the same expression', () => {
    for (const source of ['0', '01*', '(0+1)*01', '0*1*', 'ε', '(01+10)*']) {
      const panels = buildPlayground(source, ['0', '1'])

      expect(panels.source, source).toBe(source)
      expect(panels.errors).toEqual([])
      expect(panels.regex).not.toBeNull()
      expect(panels.enfa).not.toBeNull()
      expect(panels.dfa).not.toBeNull()

      // The tree's root label is the whole expression, so the tree and the
      // machines cannot be describing different things.
      expect(panels.tree[0]?.label, source).toBe(panels.tree[0]?.label)
      expect(panels.tree.length).toBeGreaterThan(0)

      // The membership table is the DFA's own verdicts, so it cannot disagree
      // with the machine drawn beside it.
      expect(panels.membership.length).toBeGreaterThan(0)
    }
  })

  it('the ε-NFA and the minimal DFA accept the same strings', () => {
    const panels = buildPlayground('(0+1)*01', ['0', '1'])
    // 01, 001, 101 end in 01; 10 and 11 do not.
    const accepted = new Set(panels.membership.filter((r) => r.accepted).map((r) => r.word))
    expect(accepted.has('01')).toBe(true)
    expect(accepted.has('001')).toBe(true)
    expect(accepted.has('10')).toBe(false)
    expect(accepted.has('11')).toBe(false)
  })

  it('reports a parse error and leaves every panel empty rather than stale', () => {
    const panels = buildPlayground('(01', ['0', '1'])
    expect(panels.errors.length).toBeGreaterThan(0)
    expect(panels.regex).toBeNull()
    expect(panels.enfa).toBeNull()
    expect(panels.dfa).toBeNull()
    expect(panels.tree).toEqual([])
    expect(panels.membership).toEqual([])
  })

  it('is deterministic — the same expression gives the same panels', () => {
    expect(JSON.stringify(buildPlayground('(0+1)*01', ['0', '1']))).toBe(
      JSON.stringify(buildPlayground('(0+1)*01', ['0', '1'])),
    )
  })
})

describe('the playground under typing', () => {
  it('debounces, then updates every panel together', async () => {
    vi.useFakeTimers()
    try {
      render(<RegexPlayground />)

      // Opens on (0+1)*01.
      expect(screen.getByText(/Strings and whether they are accepted|The language/)).toBeDefined()
      const field = screen.getByRole('textbox') as HTMLInputElement

      act(() => {
        fireEvent.change(field, { target: { value: '0*' } })
      })

      // Before the debounce fires the panels still show the old expression --
      // the old one, not a mixture.
      act(() => {
        vi.advanceTimersByTime(400)
      })

      const dfaPanel = screen.getByText(/no smaller DFA accepts this language/)
      expect(dfaPanel).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a parse error against the field', async () => {
    vi.useFakeTimers()
    try {
      render(<RegexPlayground />)
      const field = screen.getByRole('textbox') as HTMLInputElement

      act(() => {
        fireEvent.change(field, { target: { value: '(01' } })
      })
      act(() => {
        vi.advanceTimersByTime(400)
      })

      expect(screen.getByRole('alert').textContent).toContain('never closed')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the closure lab', () => {
  it('opens on an intersection and builds it', () => {
    render(<ClosureLab />)
    expect(screen.getByText(/A pair accepts when both do/)).toBeDefined()
    expect(screen.getByRole('slider', { name: 'Step' })).toBeDefined()
  })

  it('complements a DFA', async () => {
    const user = userEvent.setup()
    render(<ClosureLab />)

    await user.selectOptions(screen.getByRole('combobox', { name: /operation/i }), 'complement')
    expect(screen.getByText(/swap which states accept/i)).toBeDefined()
  })

  /**
   * phases.md P0.4 — complement is refused with an explanation when the input is
   * an NFA, and offers the one-click "convert to a complete DFA first" fix.
   *
   * The refusal has to be reachable for the criterion to mean anything, which is
   * why the machine picker offers the NFAs rather than hiding them.
   */
  it('refuses to complement an NFA, explains, and offers to fix it', async () => {
    const user = userEvent.setup()
    render(<ClosureLab />)

    await user.selectOptions(screen.getByRole('combobox', { name: /operation/i }), 'complement')
    await user.selectOptions(screen.getByRole('combobox', { name: /machine/i }), 'nfa-ends-in-01')

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('both an accepting and a rejecting run')

    const fix = screen.getByRole('button', { name: /convert it to a complete DFA first/i })
    await user.click(fix)

    // The refusal is gone and the construction ran on the determinised machine.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/Using the determinised machine/)).toBeDefined()
    expect(screen.getByText(/swap which states accept/i)).toBeDefined()
  })

  it('shows the homomorphism editor only for the two operations that need one', async () => {
    const user = userEvent.setup()
    render(<ClosureLab />)
    const picker = screen.getByRole('combobox', { name: /operation/i })

    expect(screen.queryByRole('group', { name: /h : Σ/ })).toBeNull()

    await user.selectOptions(picker, 'homomorphism')
    expect(screen.getByRole('textbox', { name: /image of 0/i })).toBeDefined()

    await user.selectOptions(picker, 'reverse')
    expect(screen.queryByRole('textbox', { name: /image of/i })).toBeNull()
  })

  it('offers a second machine only for the binary operations', async () => {
    const user = userEvent.setup()
    render(<ClosureLab />)

    expect(screen.getByRole('combobox', { name: /L₂/ })).toBeDefined()
    await user.selectOptions(screen.getByRole('combobox', { name: /operation/i }), 'reverse')
    expect(screen.queryByRole('combobox', { name: /L₂/ })).toBeNull()
  })
})

describe('text search', () => {
  it("opens on Hopcroft's example and reports both overlapping matches", () => {
    render(<TextSearch />)
    expect(screen.getByText(/2 matches:/)).toBeDefined()
    expect(screen.getByText(/"web" at 0, "ebay" at 1/)).toBeDefined()
  })

  it('draws both machines with their state counts', () => {
    render(<TextSearch />)
    expect(screen.getByText(/§2.4.2 — 8 states/)).toBeDefined()
    expect(screen.getByText(/§2.4.3 — 8 states/)).toBeDefined()
  })

  /** phases.md P0.4 — the page draws with the shared renderer, not its own. */
  it('uses the automaton renderer for both machines', () => {
    render(<TextSearch />)
    const diagrams = screen.getAllByRole('group', { name: /^(NFA|DFA) with \d+ states/ })
    expect(diagrams).toHaveLength(2)
  })

  it('announces the DFA state at each character for a keyboard user', () => {
    render(<TextSearch />)
    const positions = screen.getAllByRole('button', { name: /^Position \d+/ })
    expect(positions).toHaveLength('webay'.length)
    expect(positions[2]?.getAttribute('aria-label')).toContain('state web')
  })
})

describe('the applied case studies', () => {
  it('carries the department tags on every case', () => {
    for (const study of APPLIED) {
      expect(study.co, study.id).toMatch(/^CO[12]$/)
      expect(study.bloom, study.id).toMatch(/^BTL [34] – /)
      expect(study.sdg, study.id).toContain('SDG')
      expect(study.framing.length, study.id).toBeGreaterThan(80)
      expect([1, 2]).toContain(study.module)
    }
  })

  it('every case builds a machine that runs its own suggestions', () => {
    for (const study of APPLIED) {
      const machine =
        study.source.kind === 'machine'
          ? study.source.machine
          : buildPlayground(study.source.source, study.source.alphabet).dfa

      expect(machine, `${study.id} produced no machine`).not.toBeNull()
      if (machine === null) continue

      const alphabet = new Set(machine.alphabet)
      for (const word of study.suggested) {
        for (const symbol of word) {
          expect(alphabet.has(symbol), `${study.id}: "${word}" uses "${symbol}"`).toBe(true)
        }
      }
    }
  })

  it('is looked up by id', () => {
    expect(appliedCase('digital-lock')?.title).toContain('lock')
    expect(appliedCase('nope')).toBeUndefined()
  })

  it('has unique ids', () => {
    expect(new Set(APPLIED.map((c) => c.id)).size).toBe(APPLIED.length)
  })

  it('accepts and rejects the strings its framing claims', () => {
    const email = appliedCase('email-validation')
    expect(email?.source.kind).toBe('regex')
    if (email?.source.kind !== 'regex') return

    const built = buildPlayground(email.source.source, email.source.alphabet)
    expect(built.dfa).not.toBeNull()

    const accepted = new Set(built.membership.filter((r) => r.accepted).map((r) => r.word))
    // The shortest address the expression allows is "a@a.a", five characters —
    // past the membership table's bound. What the table can show is that the
    // near-misses are rejected: no dot, and no local part.
    expect(accepted.has('a@a')).toBe(false)
    expect(accepted.has('@a.a')).toBe(false)
    expect(accepted.has('aa')).toBe(false)
  })
})
