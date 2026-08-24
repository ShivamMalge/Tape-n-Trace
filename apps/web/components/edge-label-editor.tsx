'use client'

/**
 * Editing the label on one edge.
 *
 * An inline form rather than a `prompt()`: a native prompt cannot be styled,
 * cannot be reached by a screen reader in any useful way, and cannot show what
 * the label currently is while you retype it.
 *
 * Editing the label replaces the whole group of transitions between the pair
 * (§7), so clearing it deletes the edge — which is the only way to remove an
 * edge by pointer alone.
 */

import { useEffect, useRef, useState } from 'react'
import type { StateId } from '@tape-n-trace/engine'
import { containsEpsilon, parseEdgeLabel } from '../lib/edge-labels'

export interface EdgeLabelEditorProps {
  from: StateId
  to: StateId
  initial: string
  /** ε is only legal on an ε-NFA (ADR-002), so warn before it becomes an error. */
  allowEpsilon: boolean
  onCommit: (label: string) => void
  onCancel: () => void
}

export function EdgeLabelEditor({
  from,
  to,
  initial,
  allowEpsilon,
  onCommit,
  onCancel,
}: EdgeLabelEditorProps): React.JSX.Element {
  const [text, setText] = useState(initial)
  const input = useRef<HTMLInputElement>(null)

  // Focus and select, so retyping a label is one keystroke rather than a
  // select-all-then-type dance.
  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const reads = parseEdgeLabel(text)
  const epsilonProblem = !allowEpsilon && containsEpsilon(reads)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onCommit(text)
      }}
      className="tnt-card tnt-stack-sm"
      aria-label={`Label for the edge from ${from} to ${to}`}
    >
      <label className="tnt-field">
        <span className="tnt-muted">
          {from} → {to}, reading
        </span>
        <input
          ref={input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          placeholder="0, 1"
          spellCheck={false}
          autoComplete="off"
          className="tnt-input tnt-input-mono"
        />
      </label>

      <p className="tnt-muted tnt-xs" style={{ margin: 0 }}>
        Comma-separated. Write <code>eps</code> or <code>ε</code> for an ε-transition. Leave it empty
        to delete the edge.
      </p>

      {epsilonProblem ? (
        <p className="tnt-xs" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
          This machine is not an ε-NFA, so an ε-transition would make it invalid. Change its kind
          first, or use a symbol.
        </p>
      ) : null}

      <div className="tnt-row">
        <button type="submit" className="tnt-btn tnt-btn-primary">
          {reads.length === 0 ? 'Delete edge' : 'Save label'}
        </button>
        <button type="button" onClick={onCancel} className="tnt-btn">
          Cancel
        </button>
      </div>
    </form>
  )
}
