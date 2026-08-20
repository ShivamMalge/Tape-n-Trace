/**
 * The artifact renderers — the "table underneath" of the stepper shell.
 *
 * Driven by real traces rather than hand-written fixtures, for the same reason
 * the automaton tests are: a fake snapshot would keep passing while the engine
 * changed shape underneath it.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  dfaContains01,
  minimize,
  nfaEndsIn01,
  nfaToDfa,
  parseRegex,
  regexToENFA,
  unwrap,
} from '@tape-n-trace/engine'
import type { MinimizeSnapshot, SubsetSnapshot, ThompsonSnapshot } from '@tape-n-trace/engine'
import { DataTable, ParseTree, TriangleTable } from '../src/index.js'

describe('DataTable', () => {
  const trace = unwrap(nfaToDfa(nfaEndsIn01))
  const step = trace.steps[1]
  const snapshot = step?.snapshot as SubsetSnapshot

  const columns = [
    { key: 'state', label: 'DFA state' },
    ...snapshot.source.alphabet.map((s) => ({ key: s, label: s })),
  ]
  const rows = snapshot.table.map((row) => ({
    key: row.name,
    cells: { state: row.name, ...row.moves },
  }))

  it('renders a row per subset and a column per symbol', () => {
    const markup = renderToStaticMarkup(<DataTable columns={columns} rows={rows} />)
    for (const row of snapshot.table) {
      expect(markup).toContain(`data-row-key="${row.name}"`)
    }
    expect(markup).toContain('data-cell="{q0} 0"')
  })

  /** The point of string row and column keys: a cell can be lit by name. */
  it('lights the cells the step highlighted', () => {
    const markup = renderToStaticMarkup(<DataTable columns={columns} rows={rows} step={step} />)
    expect(markup).toContain('data-lit="true"')

    const unlit = renderToStaticMarkup(<DataTable columns={columns} rows={rows} />)
    expect(unlit).not.toContain('data-lit="true"')
  })

  it('marks the row the step is working on', () => {
    const markup = renderToStaticMarkup(
      <DataTable columns={columns} rows={[{ ...rows[0]!, role: 'current' }]} />,
    )
    expect(markup).toContain('data-role="current"')
  })

  it('says so rather than rendering an empty grid', () => {
    expect(renderToStaticMarkup(<DataTable columns={columns} rows={[]} />)).toContain(
      'Nothing in the table yet',
    )
  })
})

describe('TriangleTable', () => {
  const trace = unwrap(minimize(dfaContains01))
  const final = trace.steps.at(-1)?.snapshot as MinimizeSnapshot

  it('draws only the lower triangle — a pair appears once, never with itself', () => {
    const markup = renderToStaticMarkup(
      <TriangleTable states={final.states} marks={final.marks} />,
    )
    // n states give n(n-1)/2 cells, not n².
    const cells = markup.match(/aria-label="[^"]* against [^"]*"/g) ?? []
    const n = final.states.length
    expect(cells).toHaveLength((n * (n - 1)) / 2)
  })

  it('shows the round a pair was marked in, not a tick', () => {
    const markup = renderToStaticMarkup(
      <TriangleTable states={final.states} marks={final.marks} />,
    )
    expect(markup).toContain('data-round="0"')
    expect(markup).toContain('distinguishable, round 0')
  })

  it('leaves equivalent pairs blank and says what a blank means', () => {
    const markup = renderToStaticMarkup(<TriangleTable states={['a', 'b']} marks={{}} />)
    expect(markup).toContain('equivalent so far')
    expect(markup).toContain('those are the states that merge')
  })

  it('handles a one-state automaton, which has no pairs at all', () => {
    expect(renderToStaticMarkup(<TriangleTable states={['q0']} marks={{}} />)).toContain(
      'no pairs to compare',
    )
  })
})

describe('ParseTree', () => {
  const regex = unwrap(parseRegex('(0+1)*01'))
  const trace = unwrap(regexToENFA(regex, ['0', '1']))
  const nodes = (trace.steps[0]?.snapshot as ThompsonSnapshot).nodes

  it('draws one node per parse-tree node, with the operator on it', () => {
    const markup = renderToStaticMarkup(<ParseTree nodes={nodes} />)
    expect(markup.match(/data-node-id=/g)).toHaveLength(nodes.length)
    expect(markup).toContain('data-op="star"')
    expect(markup).toContain('data-op="union"')
    expect(markup).toContain('data-op="concat"')
  })

  it('shows a symbol node as its symbol rather than as a blank circle', () => {
    const markup = renderToStaticMarkup(<ParseTree nodes={nodes} />)
    const symbolNodes = markup.match(/data-op="symbol"/g) ?? []
    // (0+1)*01 has four symbol leaves.
    expect(symbolNodes).toHaveLength(4)
    expect(markup).toContain('Symbol for 0')
  })

  it('highlights the node the step is building', () => {
    const built = trace.steps[1]
    const markup = renderToStaticMarkup(<ParseTree nodes={nodes} step={built} />)
    expect(markup).toContain('built this step')
  })

  it('is deterministic, so the layout can be trusted in a snapshot', () => {
    expect(renderToStaticMarkup(<ParseTree nodes={nodes} />)).toBe(
      renderToStaticMarkup(<ParseTree nodes={nodes} />),
    )
  })

  it('renders the whole tree the same way twice for the same expression', () => {
    expect(renderToStaticMarkup(<ParseTree nodes={nodes} />)).toMatchSnapshot()
  })
})
