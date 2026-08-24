'use client'

/**
 * Paste a list of strings, get accept/reject for all of them at once.
 *
 * This is how a student checks their understanding of a *language* rather than
 * of one run — and how they check an answer against a question paper that gives
 * four sample strings. Clicking a row loads that string's full trace, so the
 * table is a way into the step-by-step view rather than a replacement for it.
 */

import { useState } from 'react'
import { isOk, simulate } from '@tape-n-trace/engine'
import type { FiniteAutomaton } from '@tape-n-trace/engine'

interface Row {
  word: string
  outcome: 'accepted' | 'rejected' | 'stopped' | 'invalid'
  note: string | null
}

export function MultiRunTable({
  machine,
  onLoad,
}: {
  machine: FiniteAutomaton
  onLoad: (word: string) => void
}): React.JSX.Element {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)

  const runAll = (): void => {
    // One string per line; a blank line is the empty string, which is a
    // legitimate and frequently interesting input.
    const words = text.split('\n').map((line) => line.trim())
    setRows(words.map((word) => runOne(machine, word)))
  }

  return (
    <section className="tnt-stack-sm">
      <h2 style={{ margin: 0 }}>Run many strings</h2>
      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        One string per line. A blank line means the empty string.
      </p>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        spellCheck={false}
        aria-label="Strings to test, one per line"
        className="tnt-input tnt-input-mono"
        style={{ resize: 'vertical' }}
      />

      <div>
        <button type="button" className="tnt-btn" onClick={runAll} disabled={text.trim() === ''}>
          Test all
        </button>
      </div>

      {rows === null ? null : (
        <table className="tnt-table" style={{ width: '100%' }}>
          <caption>
            {rows.filter((r) => r.outcome === 'accepted').length} of {rows.length} accepted. Select a row
            to step through its run.
          </caption>
          <thead>
            <tr>
              <Th>String</Th>
              <Th>Result</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.word}-${i}`}>
                <td>
                  {/* A button that has to read as a link. No primitive covers
                      that shape, so it stays inline. */}
                  <button
                    type="button"
                    className="tnt-mono"
                    onClick={() => onLoad(row.word)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--tnt-current)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {row.word === '' ? 'ε' : row.word}
                  </button>
                </td>
                <td style={{ color: outcomeColor(row.outcome) }}>{row.outcome}</td>
                <td className="tnt-muted">{row.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function runOne(machine: FiniteAutomaton, word: string): Row {
  const result = simulate(machine, word)
  if (!isOk(result)) {
    return { word, outcome: 'invalid', note: result.errors[0]?.message ?? null }
  }

  const verdict = result.value.result
  if (verdict.type === 'incomplete') {
    return { word, outcome: 'stopped', note: verdict.reason }
  }
  if (verdict.type === 'acceptance') {
    return { word, outcome: verdict.accepted ? 'accepted' : 'rejected', note: verdict.note ?? null }
  }
  return { word, outcome: 'stopped', note: null }
}

function outcomeColor(outcome: Row['outcome']): string {
  switch (outcome) {
    case 'accepted':
      return 'var(--tnt-accepting)'
    case 'rejected':
      return 'var(--tnt-text)'
    default:
      return 'var(--tnt-marked)'
  }
}

function Th({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <th scope="col" className="tnt-muted">
      {children}
    </th>
  )
}
