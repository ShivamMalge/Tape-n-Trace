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
    <section style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>States</h2>
        <button type="button" onClick={onAdd} style={smallButton} title="Add a state (A)">
          Add state
        </button>
      </div>

      {machine.states.length === 0 ? (
        <p className="tnt-muted" style={{ fontSize: 13, margin: 0 }}>
          No states yet. Add one, or click the canvas.
        </p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
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
              <tr
                key={id}
                style={{
                  borderTop: '1px solid var(--tnt-border)',
                  background: selected === id ? 'var(--tnt-current-soft)' : undefined,
                }}
              >
                <td style={cell}>
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
                      style={nameInput}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(id)
                        setRenaming({ id, text: id })
                      }}
                      title={`Select ${id}, or edit its name`}
                      style={nameButton}
                    >
                      {id}
                    </button>
                  )}
                </td>

                <td style={cell}>
                  <input
                    type="radio"
                    name="start-state"
                    checked={machine.start === id}
                    onChange={() => onSetStart(id)}
                    aria-label={`Make ${id} the start state`}
                  />
                </td>

                <td style={cell}>
                  <input
                    type="checkbox"
                    checked={machine.accepting.includes(id)}
                    onChange={() => onToggleAccepting(id)}
                    aria-label={`Make ${id} an accepting state`}
                  />
                </td>

                <td style={{ ...cell, textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    aria-label={`Delete state ${id} and every transition touching it`}
                    style={smallButton}
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
    <th scope="col" style={{ ...cell, textAlign: 'left', fontSize: 12, color: 'var(--tnt-text-muted)' }}>
      {children}
    </th>
  )
}

const cell: React.CSSProperties = { padding: '4px 8px' }

const smallButton: React.CSSProperties = {
  padding: '3px 9px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  fontSize: 12,
  cursor: 'pointer',
}

const nameButton: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 14,
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--tnt-current)',
  cursor: 'pointer',
  textDecoration: 'underline',
}

const nameInput: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 14,
  width: 110,
  padding: '2px 5px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-current)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
}
