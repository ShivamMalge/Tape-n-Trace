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
      <div role="status" style={box('var(--tnt-marked)')}>
        <strong style={{ color: 'var(--tnt-marked)', fontSize: 15 }}>Stopped without finishing</strong>
        <p style={{ margin: 0, fontSize: 14 }}>{trace.result.reason}</p>
        {trace.meta.truncated === undefined ? null : (
          <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
            {trace.meta.truncated.reason}
          </p>
        )}
      </div>
    )
  }

  if (!atEnd) {
    return (
      <p className="tnt-muted" style={{ fontSize: 13, margin: 0 }}>
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
    <div role="status" style={box('var(--tnt-accepting)')}>
      <strong style={{ color: 'var(--tnt-accepting)', fontSize: 15 }}>{summary.headline}</strong>
      <p style={{ margin: 0, fontSize: 15, fontFamily: 'var(--tnt-mono)', wordBreak: 'break-word' }}>
        {summary.body}
      </p>
      {summary.note === null ? null : (
        <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
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

function box(color: string): React.CSSProperties {
  return {
    display: 'grid',
    gap: 5,
    padding: '11px 14px',
    borderRadius: 'var(--tnt-radius)',
    border: `1px solid ${color}`,
    background: 'var(--tnt-surface)',
  }
}

const linkButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'var(--tnt-current)',
  cursor: 'pointer',
  textDecoration: 'underline',
}
