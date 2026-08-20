/**
 * The conversion registry and the stepper shell.
 *
 * The registry test is the important one: every conversion the catalogue offers
 * must actually run from the source the page opens on. A registry entry that
 * links to a page that throws is the exact failure the "one list" pattern exists
 * to prevent, and it is invisible until someone clicks it.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GALLERY, isOk, parseRegex, isErr } from '@tape-n-trace/engine'
import { CONVERSIONS, conversionById } from '../lib/conversions'
import type { ConversionInput } from '../lib/conversions'
import { SAMPLE_GRAMMARS, SAMPLE_REGEXES } from '../lib/sample-inputs'
import { artifactOf, panesOf } from '../lib/artifact'
import { ConversionWorkbench } from '../components/conversion-workbench'

afterEach(cleanup)

/** The input the page would open on for this conversion. */
function defaultInput(conversion: (typeof CONVERSIONS)[number]): ConversionInput {
  switch (conversion.takes) {
    case 'machine': {
      const entry = GALLERY.find((g) =>
        conversion.accepts === undefined ? true : conversion.accepts.includes(g.machine.kind),
      )
      if (entry === undefined) throw new Error(`no gallery machine suits ${conversion.id}`)
      return { kind: 'machine', machine: entry.machine }
    }
    case 'regex':
      return { kind: 'regex', source: SAMPLE_REGEXES[0]!.source }
    case 'grammar':
      return { kind: 'grammar', grammar: SAMPLE_GRAMMARS[0]!.grammar }
  }
}

describe('the conversion registry', () => {
  it('has unique ids and finds them', () => {
    expect(new Set(CONVERSIONS.map((c) => c.id)).size).toBe(CONVERSIONS.length)
    expect(conversionById('nfa-to-dfa')?.title).toContain('DFA')
    expect(conversionById('no-such-thing')).toBeUndefined()
  })

  it.each(CONVERSIONS.map((c) => [c.id, c] as const))(
    '%s runs on the source its page opens with',
    (_id, conversion) => {
      const result = conversion.run(defaultInput(conversion))
      expect(isOk(result), `${conversion.id} failed to run`).toBe(true)
      if (!isOk(result)) return
      expect(result.value.steps.length).toBeGreaterThan(1)
    },
  )

  it.each(CONVERSIONS.map((c) => [c.id, c] as const))(
    '%s produces an artifact and panes the shell can draw',
    (_id, conversion) => {
      const result = conversion.run(defaultInput(conversion))
      if (!isOk(result)) throw new Error('did not run')
      const trace = result.value

      for (const step of trace.steps) {
        const artifact = artifactOf(trace, step)
        expect(artifact.kind, `${conversion.id} has no artifact renderer`).not.toBe('none')
        // Every conversion must put something on at least one side.
        const panes = panesOf(trace, step)
        expect(panes.source !== null || panes.target !== null).toBe(true)
      }
    },
  )

  it.each(CONVERSIONS.map((c) => [c.id, c] as const))(
    '%s rejects an input of the wrong kind rather than throwing',
    (_id, conversion) => {
      const wrong: ConversionInput =
        conversion.takes === 'machine'
          ? { kind: 'regex', source: '0' }
          : { kind: 'machine', machine: GALLERY[0]!.machine }

      const result = conversion.run(wrong)
      expect(isErr(result)).toBe(true)
    },
  )

  it('every machine conversion has at least one gallery machine it accepts', () => {
    for (const conversion of CONVERSIONS.filter((c) => c.takes === 'machine')) {
      const suitable = GALLERY.filter((g) =>
        conversion.accepts === undefined ? true : conversion.accepts.includes(g.machine.kind),
      )
      expect(suitable.length, `${conversion.id} offers no machine`).toBeGreaterThan(0)
    }
  })

  it('every sample regular expression parses', () => {
    for (const sample of SAMPLE_REGEXES) {
      expect(isOk(parseRegex(sample.source)), `${sample.source} does not parse`).toBe(true)
    }
  })
})

describe('the stepper shell', () => {
  function slider(): HTMLInputElement {
    return screen.getByRole('slider', { name: 'Step' }) as HTMLInputElement
  }

  it('opens on step 1 with the source drawn and the result still empty', () => {
    render(<ConversionWorkbench conversionId="nfa-to-dfa" />)

    // `accepts` lists NFA first, so the page opens on a machine where the
    // subset construction actually does something.
    expect(screen.getByRole('group', { name: /^NFA with 3 states/i })).toBeDefined()
    expect(screen.getByText(/Start from the subset/)).toBeDefined()
    // The answer is deliberately withheld until the last step.
    expect(screen.getByText(/The answer appears at the last step/)).toBeDefined()
  })

  it('reveals the result only at the end, and offers a way to skip there', async () => {
    const user = userEvent.setup()
    render(<ConversionWorkbench conversionId="nfa-to-dfa" />)

    await user.click(screen.getByRole('button', { name: /skip to it/i }))

    const status = screen.getAllByRole('status').at(-1) as HTMLElement
    expect(within(status).getByText(/^Result: DFA with/)).toBeDefined()
  })

  it('scrubs to any step without re-running the conversion', () => {
    render(<ConversionWorkbench conversionId="minimize" />)
    const last = Number(slider().max)

    act(() => {
      fireEvent.change(slider(), { target: { value: String(last) } })
    })
    expect(screen.getByText(/^Result: DFA with/)).toBeDefined()

    act(() => {
      fireEvent.change(slider(), { target: { value: '0' } })
    })
    expect(screen.getByText(/reachable from/)).toBeDefined()
  })

  it('shows the parse tree for a regular expression, and reparses as it is typed', async () => {
    const user = userEvent.setup()
    render(<ConversionWorkbench conversionId="re-to-enfa" />)

    expect(screen.getByText(/Build an ε-NFA for/)).toBeDefined()

    const field = screen.getByRole('textbox', { name: /regular expression/i })
    await user.clear(field)
    await user.type(field, '0*')
    expect(screen.getByText(/Build an ε-NFA for 0\*/)).toBeDefined()
  })

  it('reports a bad expression against the field instead of running anything', async () => {
    const user = userEvent.setup()
    render(<ConversionWorkbench conversionId="re-to-enfa" />)

    const field = screen.getByRole('textbox', { name: /regular expression/i })
    await user.clear(field)
    await user.type(field, '(01')

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('never closed')
  })

  it('draws only a result pane for a grammar conversion, since there is no source machine', () => {
    render(<ConversionWorkbench conversionId="grammar-to-nfa" />)

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    expect(headings.some((h) => h.startsWith('Result'))).toBe(true)
    expect(headings.some((h) => h.startsWith('Source'))).toBe(false)
    expect(screen.getByText(/Each variable becomes a state/)).toBeDefined()
  })
})
