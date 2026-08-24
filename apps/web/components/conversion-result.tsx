'use client'

/**
 * What the conversion produced, once it has finished.
 *
 * Shown only at the last step, on purpose: a result panel that fills in halfway
 * through invites reading the answer instead of the working, which is the exact
 * habit this tool exists to interrupt.
 *
 * A run stopped by a §9 guard reports as stopped, never as a finished answer.
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
      <div role="status" className="tnt-note tnt-note-warn tnt-stack-sm">
        <strong style={{ color: 'var(--tnt-marked)' }}>Stopped without finishing</strong>
        <p style={{ margin: 0 }}>{trace.result.reason}</p>
        {trace.meta.truncated === undefined ? null : (
          <p className="tnt-meta" style={{ margin: 0 }}>
            {trace.meta.truncated.reason}
          </p>
        )}
      </div>
    )
  }

  if (!atEnd) {
    return (
      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        The answer appears at the last step.{' '}
        <button type="button" onClick={onJumpToEnd} style={linkButton}>
          Skip to it
        </button>{' '}
        if you would rather read it than watch it.
      </p>
    )
  }

  const summary = describe(trace)
  if (summary === null) return null

  return (
    <div role="status" className="tnt-note tnt-note-good tnt-stack-sm">
      <strong style={{ color: 'var(--tnt-accepting)' }}>{summary.headline}</strong>
      <p className="tnt-mono" style={{ margin: 0, wordBreak: 'break-word' }}>
        {summary.body}
      </p>
      {summary.note === null ? null : (
        <p className="tnt-meta" style={{ margin: 0 }}>
          {summary.note}
        </p>
      )}
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

/** A button that has to read as a link; no primitive covers that shape. */
const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'var(--tnt-current)',
  cursor: 'pointer',
  textDecoration: 'underline',
}
