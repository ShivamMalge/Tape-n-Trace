'use client'

/**
 * Fig. 9.1 as a grid. Props in, table out — it computes nothing.
 *
 * Row i is Mᵢ, column j is wⱼ, and the cell is 1 when Mᵢ accepts wⱼ, 0 when it
 * does not, and ? when the run outlived its budget. The diagonal is ringed when
 * it is on screen, and the complemented diagonal — the characteristic vector of
 * L_d — can be shown as one more row beneath the table.
 */

import { cellDigit, type DiagonalCell, type DiagonalTable } from '@tape-n-trace/engine'

export interface CellRef {
  row: number
  col: number
}

const COLOUR: Record<DiagonalCell, string> = {
  accepts: 'var(--tnt-accepting)',
  'does-not-accept': 'var(--tnt-text-muted)',
  unknown: 'var(--tnt-marked)',
}

const DESCRIPTION: Record<DiagonalCell, string> = {
  accepts: 'accepts',
  'does-not-accept': 'does not accept',
  unknown: 'no answer within the budget',
}

/** Long codes are unreadable in a column head; the index is the identifier that matters. */
function short(word: string): string {
  if (word === '') return 'ε'
  return word.length <= 6 ? word : `${word.slice(0, 5)}…`
}

export function DiagonalGrid({
  table,
  selected,
  onSelect,
  showComplement,
}: {
  table: DiagonalTable
  selected: CellRef | null
  onSelect: (cell: CellRef) => void
  showComplement: boolean
}): React.JSX.Element {
  const onDiagonal = new Set(table.diagonal.map((entry) => entry.index))

  return (
    <div className="tnt-scroll-x" style={{ border: '1px solid var(--tnt-border)', borderRadius: 'var(--tnt-radius)' }}>
      <table className="tnt-table tnt-table-grid tnt-mono">
        <caption style={{ padding: 'var(--tnt-space-2) var(--tnt-space-3)' }}>
          Rows {table.fromRow}–{table.fromRow + table.size - 1} against columns {table.fromCol}–
          {table.fromCol + table.size - 1}. Cell (i, j) is 1 when M<sub>i</sub> accepts w<sub>j</sub>, 0 when it does
          not, and ? when the run had not finished after {table.stepBudget} moves.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>
              i \ j
            </th>
            {table.words.map((word) => (
              <th key={word.index} scope="col" title={word.word === '' ? 'ε (the empty string)' : word.word}>
                <div>{word.index}</div>
                <div className="tnt-muted tnt-xs" style={{ fontWeight: 400 }}>
                  {short(word.word)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.index}>
              <th scope="row" style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                <span>{row.index}</span>{' '}
                <span
                  className="tnt-muted tnt-xs"
                  style={{ fontWeight: 400 }}
                  title={row.validCode ? 'a well-formed code' : (row.reason ?? '')}
                >
                  {row.validCode ? '✓ code' : '— no moves'}
                </span>
              </th>
              {row.cells.map((cell, n) => {
                const col = table.words[n]?.index as number
                const isDiagonal = row.index === col && onDiagonal.has(row.index)
                const isSelected = selected?.row === row.index && selected.col === col
                return (
                  <td key={col}>
                    <button
                      type="button"
                      onClick={() => onSelect({ row: row.index, col })}
                      aria-pressed={isSelected}
                      aria-label={`M${row.index} on w${col}: ${DESCRIPTION[cell]}`}
                      style={{
                        width: 34,
                        height: 30,
                        display: 'block',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: COLOUR[cell],
                        background: isSelected
                          ? 'var(--tnt-current-soft)'
                          : isDiagonal
                            ? 'var(--tnt-surface)'
                            : 'transparent',
                        border: isDiagonal ? '2px solid var(--tnt-current)' : '2px solid transparent',
                      }}
                    >
                      {cellDigit(cell)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
          {showComplement && table.diagonal.length > 0 ? (
            <tr>
              <th scope="row" style={{ textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--tnt-new)' }}>
                L_d
              </th>
              {table.words.map((word) => {
                const entry = table.diagonal.find((d) => d.index === word.index)
                return (
                  <td
                    key={word.index}
                    style={{ height: 30, color: 'var(--tnt-new)', background: 'var(--tnt-surface)' }}
                    title={
                      entry === undefined
                        ? 'off the diagonal'
                        : entry.inLd === 'in'
                          ? `w${word.index} is in L_d`
                          : entry.inLd === 'out'
                            ? `w${word.index} is not in L_d`
                            : `no answer within the budget, so membership of w${word.index} is unsettled here`
                    }
                  >
                    {entry === undefined ? '' : entry.inLd === 'in' ? '1' : entry.inLd === 'out' ? '0' : '?'}
                  </td>
                )
              })}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
