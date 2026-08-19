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
    <section style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ fontSize: 15, margin: 0 }}>Run many strings</h2>
      <p className="tnt-muted" style={{ fontSize: 13, margin: 0 }}>
        One string per line. A blank line means the empty string.
      </p>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        spellCheck={false}
        aria-label="Strings to test, one per line"
        style={{
          fontFamily: 'var(--tnt-mono)',
          fontSize: 14,
          padding: 8,
          borderRadius: 'var(--tnt-radius)',
          border: '1px solid var(--tnt-border)',
          background: 'var(--tnt-bg)',
          color: 'var(--tnt-text)',
          resize: 'vertical',
        }}
      />

      <div>
        <button
          type="button"
          onClick={runAll}
          disabled={text.trim() === ''}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
            fontSize: 14,
            cursor: text.trim() === '' ? 'not-allowed' : 'pointer',
            opacity: text.trim() === '' ? 0.5 : 1,
          }}
        >
          Test all
        </button>
      </div>

      {rows === null ? null : (
        <table style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}>
          <caption className="tnt-muted" style={{ fontSize: 12, textAlign: 'left', paddingBottom: 4 }}>
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
              <tr key={`${row.word}-${i}`} style={{ borderTop: '1px solid var(--tnt-border)' }}>
                <td style={{ padding: '5px 8px' }}>
                  <button
                    type="button"
                    onClick={() => onLoad(row.word)}
                    style={{
                      fontFamily: 'var(--tnt-mono)',
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
                <td style={{ padding: '5px 8px', color: outcomeColor(row.outcome) }}>{row.outcome}</td>
                <td style={{ padding: '5px 8px' }} className="tnt-muted">
                  {row.note ?? ''}
                </td>
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
    <th
      scope="col"
      style={{ textAlign: 'left', padding: '5px 8px', fontSize: 12, color: 'var(--tnt-text-muted)' }}
    >
      {children}
    </th>
  )
}
