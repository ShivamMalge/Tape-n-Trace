'use client'

/**
 * Editing the transitions without a pointer.
 *
 * The companion to `StateInspector`: δ as a table, which is also how a question
 * paper presents it. Every transition is a row a screen reader can read out, and
 * adding one is three selects and a button rather than a drag.
 */

import { useState } from 'react'
import { EPSILON_GLYPH } from '@tape-n-trace/ui'
import type { FiniteAutomaton, Read, StateId } from '@tape-n-trace/engine'

export interface TransitionInspectorProps {
  machine: FiniteAutomaton
  onAdd: (from: StateId, read: Read, to: StateId) => void
  onRemove: (id: string) => void
}

/** The sentinel the symbol `<select>` uses for ε; no alphabet symbol can collide. */
const EPSILON_VALUE = '\u0000epsilon'

export function TransitionInspector({
  machine,
  onAdd,
  onRemove,
}: TransitionInspectorProps): React.JSX.Element {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [symbol, setSymbol] = useState('')

  const states = machine.states
  const canAdd = states.includes(from) && states.includes(to) && symbol !== ''

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!canAdd) return
    onAdd(from, symbol === EPSILON_VALUE ? null : symbol, to)
  }

  return (
    <section className="tnt-stack-sm">
      <h2 style={{ margin: 0 }}>Transitions (δ)</h2>

      <form onSubmit={submit} className="tnt-row tnt-row-end">
        <Picker label="From" value={from} onChange={setFrom} options={states} />
        <Picker
          label="Reads"
          value={symbol}
          onChange={setSymbol}
          options={machine.alphabet}
          extra={machine.kind === 'ENFA' ? { value: EPSILON_VALUE, label: EPSILON_GLYPH } : null}
        />
        <Picker label="To" value={to} onChange={setTo} options={states} />
        <button type="submit" disabled={!canAdd} className="tnt-btn">
          Add transition
        </button>
      </form>

      {machine.transitions.length === 0 ? (
        <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
          No transitions yet. Drag from one state to another on the diagram, or use the form above.
        </p>
      ) : (
        <table className="tnt-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <Th>From</Th>
              <Th>Reads</Th>
              <Th>To</Th>
              <Th>
                <span className="tnt-skip">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {machine.transitions.map((t) => (
              <tr key={t.id}>
                <td className="tnt-mono">{t.from}</td>
                <td className="tnt-mono">{t.read ?? EPSILON_GLYPH}</td>
                <td className="tnt-mono">{t.to}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => onRemove(t.id)}
                    aria-label={`Delete the transition from ${t.from} to ${t.to} on ${t.read ?? 'epsilon'}`}
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

function Picker({
  label,
  value,
  onChange,
  options,
  extra = null,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  extra?: { value: string; label: string } | null
}): React.JSX.Element {
  return (
    <label className="tnt-field">
      <span className="tnt-meta">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="tnt-input tnt-input-mono"
        style={{ minWidth: 66 }}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {extra === null ? null : <option value={extra.value}>{extra.label}</option>}
      </select>
    </label>
  )
}

function Th({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <th scope="col" className="tnt-muted">
      {children}
    </th>
  )
}
