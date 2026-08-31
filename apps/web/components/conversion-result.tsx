'use client'

/**
 * What the conversion produced, once it has finished — as the design's verdict
 * banner (artboard 00): green for a result, amber for a run a §9 guard stopped.
 *
 * Shown only at the last step, on purpose: a result panel that fills in halfway
 * through invites reading the answer instead of the working, which is the exact
 * habit this tool exists to interrupt.
 */

import { regexToString } from '@tape-n-trace/engine'
import type { FiniteAutomaton, Trace } from '@tape-n-trace/engine'

export function ConversionResult({
  trace,
  atEnd,
  onJumpToEnd,
}: {
  trace: Trace
  atEnd: boolean
  onJumpToEnd: () => void
}): React.JSX.Element | null {
  if (trace.result.type === 'incomplete') {
    return (
      <div role="status" className="tnt-banner tnt-banner-warn">
        <span className="tnt-banner-headline">Stopped</span>
        <span className="tnt-banner-detail">
          {trace.result.reason}
          {trace.meta.truncated === undefined ? null : <> {trace.meta.truncated.reason}</>}
        </span>
      </div>
    )
  }

  if (!atEnd) {
    return (
      <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: 0 }}>
        The answer appears at the last step.{' '}
        <button type="button" onClick={onJumpToEnd} className="tnt-btn-bare tnt-link">
          Skip to it
        </button>{' '}
        if you would rather read it than watch it.
      </p>
    )
  }

  const summary = describe(trace)
  if (summary === null) return null

  return (
    <div role="status" className="tnt-banner tnt-banner-good">
      <span className="tnt-banner-headline">{summary.headline}</span>
      <span className="tnt-banner-detail tnt-mono">{summary.body}</span>
      {summary.note === null ? null : <span className="tnt-meta">{summary.note}</span>}
    </div>
  )
}

interface Summary {
  headline: string
  body: string
  note: string | null
}

function describe(trace: Trace): Summary | null {
  switch (trace.result.type) {
    case 'machine': {
      const machine = trace.result.machine as FiniteAutomaton
      const kind = machine.kind === 'ENFA' ? 'ε-NFA' : machine.kind
      return {
        headline: `Result: ${kind} with ${machine.states.length} ${machine.states.length === 1 ? 'state' : 'states'}`,
        body: `Q = {${machine.states.join(', ')}}   q₀ = ${machine.start}   F = ${
          machine.accepting.length === 0 ? '∅' : `{${machine.accepting.join(', ')}}`
        }`,
        note: `${machine.transitions.length} transitions.`,
      }
    }
    case 'regex':
      return {
        headline: 'Result: a regular expression',
        body: regexToString(trace.result.regex),
        note: 'Any elimination order gives a correct expression, though not the same one.',
      }
    case 'grammar': {
      const grammar = trace.result.grammar
      return {
        headline: `Result: a grammar with ${grammar.productions.length} productions`,
        body: `V = {${grammar.variables.join(', ')}}   S = ${grammar.start}`,
        note: null,
      }
    }
    default:
      return null
  }
}
