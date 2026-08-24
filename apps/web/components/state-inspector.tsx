'use client'

/**
 * Editing the states without a pointer.
 *
 * The canvas is the fast way to draw a machine; this is the way that works with
 * a keyboard and a screen reader. It is not a fallback or a lesser path — every
 * operation the canvas offers for states is here as a labelled control, because
 * a diagram-only tool that cannot be keyboard-driven excludes students (§11.5).
 */

import { useState } from 'react'
import type { FiniteAutomaton, StateId } from '@tape-n-trace/engine'

export interface StateInspectorProps {
  machine: FiniteAutomaton
  selected: StateId | null
  onSelect: (id: StateId | null) => void
  onAdd: () => void
  onRemove: (id: StateId) => void
  onRename: (from: StateId, to: StateId) => void
  onToggleAccepting: (id: StateId) => void
  onSetStart: (id: StateId) => void
}

export function StateInspector({
  machine,
  selected,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  onToggleAccepting,
  onSetStart,
}: StateInspectorProps): React.JSX.Element {
  const [renaming, setRenaming] = useState<{ id: StateId; text: string } | null>(null)

  const commitRename = (): void => {
    if (renaming === null) return
    const trimmed = renaming.text.trim()
    if (trimmed !== '' && trimmed !== renaming.id) onRename(renaming.id, trimmed)
    setRenaming(null)
  }

  return (
    <section className="tnt-stack-sm">
      <div className="tnt-row tnt-row-baseline" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>States</h2>
        <button type="button" onClick={onAdd} className="tnt-btn" title="Add a state (A)">
          Add state
        </button>
      </div>

      {machine.states.length === 0 ? (
        <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
          No states yet. Add one, or click the canvas.
        </p>
      ) : (
        <table className="tnt-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <Th>State</Th>
              <Th>Start</Th>
              <Th>Accepting</Th>
              <Th>
                <span className="tnt-skip">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {machine.states.map((id) => (
              <tr key={id} style={{ background: selected === id ? 'var(--tnt-current-soft)' : undefined }}>
                <td>
                  {renaming?.id === id ? (
                    <input
                      value={renaming.text}
                      autoFocus
                      onChange={(event) => setRenaming({ id, text: event.target.value })}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename()
                        if (event.key === 'Escape') setRenaming(null)
                      }}
                      aria-label={`Rename state ${id}`}
                      className="tnt-input tnt-input-mono"
                      style={{ width: 110, borderColor: 'var(--tnt-current)' }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(id)
                        setRenaming({ id, text: id })
                      }}
                      title={`Select ${id}, or edit its name`}
                      className="tnt-mono"
                      style={nameButton}
                    >
                      {id}
                    </button>
                  )}
                </td>

                <td>
                  <input
                    type="radio"
                    name="start-state"
                    checked={machine.start === id}
                    onChange={() => onSetStart(id)}
                    aria-label={`Make ${id} the start state`}
                  />
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={machine.accepting.includes(id)}
                    onChange={() => onToggleAccepting(id)}
                    aria-label={`Make ${id} an accepting state`}
                  />
                </td>

                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    aria-label={`Delete state ${id} and every transition touching it`}
                    className="tnt-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Th({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <th scope="col" className="tnt-muted">
      {children}
    </th>
  )
}

/** A button shaped like a link, which no primitive covers: the row's own name. */
const nameButton: React.CSSProperties = {
  // A button does not inherit its font size; the family comes from `.tnt-mono`.
  fontSize: 'inherit',
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--tnt-current)',
  cursor: 'pointer',
  textDecoration: 'underline',
}
