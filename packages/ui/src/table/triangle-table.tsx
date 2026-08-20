/**
 * The table-filling triangle — Hopcroft 2e §4.4.1, Fig. 4.9.
 *
 * Its own component rather than a `DataTable` with blanks, because the shape
 * carries the meaning: only the lower triangle exists, since {p,q} and {q,p} are
 * the same pair and {p,p} is not a pair at all. A square grid would invite a
 * student to look for information in cells that cannot hold any.
 *
 * Each marked cell shows the **round** it was marked in, not a tick. That is
 * what turns the finished table from an answer into an argument: round 0 is
 * "distinguished by ε", round 3 is "distinguished by some string of length 3",
 * and reading the numbers back out reconstructs the proof.
 */

import type { StateId, Step } from '@tape-n-trace/engine'

export interface TriangleTableProps {
  /** In table order; row *i* is compared against columns 0..i-1. */
  states: readonly StateId[]
  /** `p|q` (states in table order) to the round the pair was marked in. */
  marks: Record<string, number>
  step?: Step | null | undefined
  className?: string
}

export function TriangleTable({
  states,
  marks,
  step = null,
  className,
}: TriangleTableProps): React.JSX.Element {
  // Cells marked *this* step, so the round just added stands out from the rest.
  const fresh = new Set<string>()
  for (const h of step?.highlight ?? []) {
    if (h.type === 'tableCell') fresh.add(key(states, h.row, h.col))
  }

  const rows = states.slice(1)
  const columns = states.slice(0, -1)

  if (rows.length === 0) {
    return (
      <p className={className} style={{ fontSize: 13, margin: 0 }}>
        A one-state automaton has no pairs to compare, so the table is empty.
      </p>
    )
  }

  return (
    <div className={className} style={{ overflow: 'auto' }}>
      <table
        style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--tnt-mono)' }}
        aria-label="Table of state distinguishabilities"
      >
        <tbody>
          {rows.map((row, r) => (
            <tr key={row}>
              <th
                scope="row"
                style={{ padding: '3px 8px', textAlign: 'right', color: 'var(--tnt-text-muted)' }}
              >
                {row}
              </th>
              {columns.map((col, c) =>
                // Only the lower triangle: a pair appears once, and never with itself.
                c > r ? (
                  <td key={col} style={{ padding: 0, border: 'none' }} />
                ) : (
                  <Cell
                    key={col}
                    round={marks[key(states, row, col)]}
                    isFresh={fresh.has(key(states, row, col))}
                    label={`${row} against ${col}`}
                  />
                ),
              )}
            </tr>
          ))}
          <tr>
            <td />
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                style={{ padding: '3px 8px', color: 'var(--tnt-text-muted)', fontWeight: 400 }}
              >
                {col}
              </th>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="tnt-muted" style={{ fontSize: 12, marginTop: 8, fontFamily: 'var(--tnt-font)' }}>
        A number is the round in which that pair was found distinguishable. A blank cell is a pair no
        string can tell apart — those are the states that merge.
      </p>
    </div>
  )
}

function Cell({
  round,
  isFresh,
  label,
}: {
  round: number | undefined
  isFresh: boolean
  label: string
}): React.JSX.Element {
  const marked = round !== undefined

  return (
    <td
      data-lit={isFresh ? 'true' : undefined}
      data-round={round}
      aria-label={marked ? `${label}: distinguishable, round ${round}` : `${label}: equivalent so far`}
      style={{
        border: '1px solid var(--tnt-border)',
        width: 34,
        height: 30,
        textAlign: 'center',
        background: isFresh
          ? 'var(--tnt-current)'
          : marked
            ? 'var(--tnt-current-soft)'
            : 'var(--tnt-bg)',
        color: isFresh ? '#fff' : marked ? 'var(--tnt-current)' : 'var(--tnt-text-muted)',
        fontWeight: isFresh ? 700 : 500,
        transition: 'background 140ms ease',
      }}
    >
      {marked ? round : ''}
    </td>
  )
}

/** Pair key in table order, so {p,q} and {q,p} land on the same cell. */
function key(order: readonly StateId[], p: StateId, q: StateId): string {
  return order.indexOf(p) < order.indexOf(q) ? `${p}|${q}` : `${q}|${p}`
}
