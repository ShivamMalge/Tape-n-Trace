/**
 * Renderer tests — architecture.md §11.4, and the P0.2 acceptance criteria.
 *
 * Rendered to static markup rather than into a DOM: these components have no
 * effects and no state by construction, so the markup *is* the whole output, and
 * a diff of it is exactly the regression signal §11.4 asks for.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  deserialise,
  dfaContains01,
  enfaZerosThenOnes,
  nfaEndsIn01,
  serialise,
  simulate,
  simulateNFA,
  unwrap,
} from '@tape-n-trace/engine'
import type { FiniteAutomaton, NFASnapshot, Trace } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, InputStrip, TransportBar } from '../src/index.js'

const noop = (): void => {}

/**
 * Whether the button carrying this label is disabled. Written as a scan for the
 * enclosing tag rather than a fixed substring, because attribute order in the
 * rendered markup is React's business and not a contract worth asserting on.
 */
function isDisabled(markup: string, label: string): boolean {
  const tag = markup.split('<button').find((chunk) => chunk.includes(`aria-label="${label}"`))
  if (tag === undefined) throw new Error(`no button labelled "${label}" in the markup`)
  return tag.slice(0, tag.indexOf('>')).includes('disabled=""')
}

describe('AutomatonRenderer', () => {
  it('draws a machine at rest, with no highlights', () => {
    const markup = renderToStaticMarkup(<AutomatonRenderer machine={dfaContains01} />)
    expect(markup).toMatchSnapshot()
  })

  it('marks the state the run is currently in', () => {
    const trace = unwrap(simulate(dfaContains01, '01')) as Trace
    const markup = renderToStaticMarkup(<AutomatonRenderer machine={dfaContains01} step={trace.steps[2]} />)
    expect(markup).toContain('data-role="current"')
    expect(markup).toMatchSnapshot()
  })

  it('draws every state and every merged edge', () => {
    const markup = renderToStaticMarkup(<AutomatonRenderer machine={dfaContains01} />)
    for (const state of dfaContains01.states) {
      expect(markup).toContain(`data-state-id="${state}"`)
    }
    // Six transitions become five drawn edges: only q2's pair of self-loops
    // merges, into one edge labelled "0, 1".
    expect(markup.match(/data-transition-ids=/g)).toHaveLength(5)
    expect(markup).toContain('0, 1')
  })

  it('describes itself for a reader who cannot see it', () => {
    const markup = renderToStaticMarkup(<AutomatonRenderer machine={enfaZerosThenOnes} />)
    expect(markup).toContain('ε-NFA with 2 states')
    expect(markup).toContain('aria-label="State A, start state"')
  })

  it('keeps SVG marker ids distinct, so two diagrams on a page do not collide', () => {
    const a = renderToStaticMarkup(<AutomatonRenderer machine={dfaContains01} instanceId="one" />)
    const b = renderToStaticMarkup(<AutomatonRenderer machine={dfaContains01} instanceId="two" />)
    expect(a).toContain('id="one-arrow-idle"')
    expect(b).toContain('id="two-arrow-idle"')
    expect(a).not.toContain('two-arrow')
  })

  it('lays out a machine that arrives without coordinates', () => {
    const { layout: _dropped, ...unpositioned } = dfaContains01
    const markup = renderToStaticMarkup(<AutomatonRenderer machine={unpositioned as FiniteAutomaton} />)
    expect(markup).toContain('data-state-id="q2"')
    expect(markup).toMatchSnapshot()
  })

  /** phases.md P0.2 — "A trace loaded from JSON renders identically to the same
   *  trace produced in-process." Replay is worthless if it drifts. */
  it('renders a rehydrated trace identically to the in-process one', () => {
    const original = unwrap(simulate(nfaEndsIn01, '0101')) as Trace
    const restored = deserialise(serialise(original))

    for (let i = 0; i < original.steps.length; i++) {
      const live = renderToStaticMarkup(
        <AutomatonRenderer machine={nfaEndsIn01} step={original.steps[i]} />,
      )
      const replayed = renderToStaticMarkup(
        <AutomatonRenderer machine={nfaEndsIn01} step={restored.steps[i]} />,
      )
      expect(replayed, `step ${i} differs after a round-trip`).toBe(live)
    }
  })
})

/**
 * An NFA where one string has exactly three accepting paths and one branch that
 * dies. Built for the acceptance criterion rather than borrowed from the
 * gallery, since no textbook machine has exactly three.
 */
const threeWays: FiniteAutomaton = {
  kind: 'NFA',
  states: ['q0', 'a', 'b', 'c', 'd', 'f'],
  alphabet: ['0'],
  transitions: [
    { id: 't-a', from: 'q0', read: '0', to: 'a' },
    { id: 't-b', from: 'q0', read: '0', to: 'b' },
    { id: 't-c', from: 'q0', read: '0', to: 'c' },
    { id: 't-d', from: 'q0', read: '0', to: 'd' },
    { id: 'a-f', from: 'a', read: '0', to: 'f' },
    { id: 'b-f', from: 'b', read: '0', to: 'f' },
    { id: 'c-f', from: 'c', read: '0', to: 'f' },
  ],
  start: 'q0',
  accepting: ['f'],
}

describe('BranchTree', () => {
  const trace = unwrap(simulateNFA(threeWays, '00'))
  const final = trace.steps.at(-1)?.snapshot as NFASnapshot

  /** phases.md P0.2 — three highlighted paths, dead branches greyed at their death step. */
  it('renders three accepting paths and greys the branch that died', () => {
    const markup = renderToStaticMarkup(
      <BranchTree nodes={final.nodes} input={final.input} step={trace.steps.at(-1)} />,
    )

    expect(markup.match(/data-status="accepting"/g)).toHaveLength(3)

    // `d` had no move on the second 0, so exactly one branch died — at step 2.
    const dead = final.nodes.filter((n) => n.status === 'dead')
    expect(dead).toHaveLength(1)
    expect(dead[0]?.diedAtStep).toBe(2)
    expect(markup).toContain('died @2')
  })

  it('keeps dead branches on the diagram rather than dropping them', () => {
    const markup = renderToStaticMarkup(<BranchTree nodes={final.nodes} input={final.input} />)
    expect(markup).toContain('data-status="dead"')
    expect(markup).toMatchSnapshot()
  })

  it('summarises the tree for a screen reader', () => {
    const markup = renderToStaticMarkup(<BranchTree nodes={final.nodes} input={final.input} />)
    expect(markup).toContain('3 accepting')
  })

  it('says how many branches it left undrawn rather than truncating silently', () => {
    const markup = renderToStaticMarkup(
      <BranchTree nodes={final.nodes} input={final.input} maxNodes={3} />,
    )
    expect(markup).toContain('Showing the first 3 branches of')
  })
})

describe('InputStrip', () => {
  it('separates what has been read from what has not', () => {
    const trace = unwrap(simulate(dfaContains01, '0110')) as Trace
    const markup = renderToStaticMarkup(
      <InputStrip input={['0', '1', '1', '0']} position={2} step={trace.steps[2]} />,
    )
    expect(markup).toContain('data-role="consumed"')
    expect(markup).toContain('data-role="lookahead"')
    expect(markup).toMatchSnapshot()
  })

  it('says so when the input is the empty string', () => {
    const markup = renderToStaticMarkup(<InputStrip input={[]} position={0} />)
    expect(markup).toContain('the empty string')
  })
})

describe('TransportBar', () => {
  const props = {
    stepIndex: 2,
    stepCount: 6,
    playing: false,
    speed: 1,
    onStepChange: noop,
    onPlayingChange: noop,
    onSpeedChange: noop,
  }

  it('renders the full control set', () => {
    expect(renderToStaticMarkup(<TransportBar {...props} />)).toMatchSnapshot()
  })

  it('announces the step and its narration together', () => {
    const markup = renderToStaticMarkup(<TransportBar {...props} narration="Read 0 and move to q1." />)
    expect(markup).toContain('Step 3 of 6. Read 0 and move to q1.')
  })

  it('disables everything when there is no trace', () => {
    const markup = renderToStaticMarkup(<TransportBar {...props} stepCount={0} stepIndex={0} />)
    expect(markup.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it('cannot step back from the first step or forward from the last', () => {
    const first = renderToStaticMarkup(<TransportBar {...props} stepIndex={0} />)
    expect(isDisabled(first, 'Previous step')).toBe(true)
    expect(isDisabled(first, 'Next step')).toBe(false)

    const last = renderToStaticMarkup(<TransportBar {...props} stepIndex={5} />)
    expect(isDisabled(last, 'Next step')).toBe(true)
    expect(isDisabled(last, 'Previous step')).toBe(false)
  })
})
