'use client'

/**
 * The two tables of §9.2 — phases.md P1.7.
 *
 * **Closure.** Exercise 9.2.6 asks which operations the recursive and the RE
 * languages are closed under and prints no answers; §9.2.2 proves the one row
 * that matters most. Clicking a cell shows the construction, or the language
 * that shows there is none. Rows the book sets rather than proves are labelled
 * as such — the answers are worked, and pretending otherwise would put a
 * citation on something that has none.
 *
 * **Placement.** Of the nine ways to put a language and its complement into
 * Fig. 9.2, Theorems 9.3 and 9.4 leave four. The grid shows all nine and names
 * the theorem that rules out each of the five.
 */

import { useState } from 'react'
import { COMPLEMENT_PLACEMENTS, RECURSIVE_RE_CLOSURE, type ClosureRow } from '@tape-n-trace/engine'

type Which = 'recursive' | 're'

export function ClosureTable(): React.JSX.Element {
  const [open, setOpen] = useState<{ op: string; which: Which } | null>(null)
  const selected = open === null ? undefined : RECURSIVE_RE_CLOSURE.find((r) => r.op === open.op)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 420 }}>
          <caption className="tnt-muted" style={{ captionSide: 'top', textAlign: 'left', paddingBottom: 6, fontSize: 12 }}>
            Choose a cell for the construction, or for the language that shows there is none.
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ ...cell, textAlign: 'left' }}>
                Operation
              </th>
              <th scope="col" style={cell}>
                Recursive
              </th>
              <th scope="col" style={cell}>
                Recursively enumerable
              </th>
            </tr>
          </thead>
          <tbody>
            {RECURSIVE_RE_CLOSURE.map((row) => (
              <tr key={row.op}>
                <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 500 }}>
                  {row.op}
                  {row.source === 'printed' ? null : (
                    <span className="tnt-muted" style={{ fontSize: 11 }}> ·&nbsp;exercise</span>
                  )}
                </th>
                {(['recursive', 're'] as Which[]).map((which) => {
                  const closed = row[which] === 'closed'
                  const isOpen = open?.op === row.op && open.which === which
                  return (
                    <td key={which} style={{ ...cell, padding: 0 }}>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : { op: row.op, which })}
                        aria-pressed={isOpen}
                        aria-label={`${row.op}, ${which === 're' ? 'recursively enumerable' : 'recursive'}: ${closed ? 'closed' : 'not closed'}`}
                        style={{
                          font: 'inherit',
                          width: '100%',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          border: 'none',
                          background: isOpen ? 'var(--tnt-current-soft)' : 'transparent',
                          color: closed ? 'var(--tnt-accepting)' : 'var(--tnt-marked)',
                          fontWeight: closed ? 400 : 600,
                        }}
                      >
                        {closed ? 'closed' : 'not closed'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected === undefined || open === null ? (
        <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
          Every row but complementation is Exercise 9.2.6, which the book sets and does not answer. Those answers are
          worked here and marked <em>exercise</em>; complementation is Theorems 9.3 and 9.4, printed.
        </p>
      ) : (
        <ClosureDetail row={selected} which={open.which} />
      )}
    </div>
  )
}

function ClosureDetail({ row, which }: { row: ClosureRow; which: Which }): React.JSX.Element {
  const closed = row[which] === 'closed'
  return (
    <div
      className="tnt-card"
      style={{ display: 'grid', gap: 6, borderLeft: `4px solid ${closed ? 'var(--tnt-accepting)' : 'var(--tnt-marked)'}` }}
    >
      <strong style={{ fontSize: 14 }}>
        {which === 're' ? 'The RE languages are' : 'The recursive languages are'} {closed ? '' : 'not '}closed under{' '}
        {row.op.toLowerCase()}.
      </strong>
      <p style={{ margin: 0, fontSize: 14 }}>{which === 're' ? row.reWhy : row.recursiveWhy}</p>
      <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
        Hopcroft 2e §{row.citation}
        {row.source === 'printed'
          ? ' — proved in the text.'
          : ' — the book sets this as an exercise and prints no answer; the construction above is the worked answer.'}
      </p>
    </div>
  )
}

const RING_LABEL: Record<string, string> = {
  recursive: 'recursive',
  're-not-recursive': 'RE, not recursive',
  'not-re': 'not RE',
}

const RINGS = ['recursive', 're-not-recursive', 'not-re']

export function ComplementPlacements(): React.JSX.Element {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
        <caption className="tnt-muted" style={{ captionSide: 'top', textAlign: 'left', paddingBottom: 6, fontSize: 12 }}>
          Rows: where L sits. Columns: where its complement sits. Four of the nine are possible (§9.2.2, p. 377).
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...cell, textAlign: 'left' }}>
              L \ complement of L
            </th>
            {RINGS.map((ring) => (
              <th key={ring} scope="col" style={cell}>
                {RING_LABEL[ring]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RINGS.map((language) => (
            <tr key={language}>
              <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 500 }}>
                {RING_LABEL[language]}
              </th>
              {RINGS.map((complement) => {
                const entry = COMPLEMENT_PLACEMENTS.find((p) => p.language === language && p.complement === complement)
                if (entry === undefined) return <td key={complement} style={cell} />
                return (
                  <td
                    key={complement}
                    style={{
                      ...cell,
                      maxWidth: 200,
                      background: entry.possible ? 'var(--tnt-accepting-soft)' : 'var(--tnt-dead-soft)',
                      color: entry.possible ? 'var(--tnt-text)' : 'var(--tnt-text-muted)',
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>{entry.possible ? 'possible' : 'impossible'}</strong>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{entry.why}</div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const cell: React.CSSProperties = {
  border: '1px solid var(--tnt-border)',
  padding: '8px 14px',
  textAlign: 'left',
  verticalAlign: 'top',
}
