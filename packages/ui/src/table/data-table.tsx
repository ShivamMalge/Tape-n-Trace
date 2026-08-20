/**
 * The generic grid — the "artifact table underneath" of the stepper shell.
 *
 * Four of the six conversions produce something tabular: the subset table, the
 * ε-closure table, the edge labels of a generalised automaton, the productions
 * of a grammar. They differ in what the columns mean, not in how a table works,
 * so they share one renderer and supply their own rows.
 *
 * Cells light up from `tableCell` highlights, matched on the row and column keys
 * the engine emitted. That is the whole reason those highlights carry strings
 * rather than indices: a row key survives the table being re-sorted or grown.
 */

import type { Step } from '@tape-n-trace/engine'

export interface TableColumn {
  key: string
  label: string
  /** Rendered in a monospace column — state names, symbols, expressions. */
  mono?: boolean
}

export interface TableRow {
  key: string
  cells: Record<string, string>
  /** Colours the whole row: the subset being expanded, a state being removed. */
  role?: 'current' | 'new' | 'dead' | undefined
}

export interface DataTableProps {
  columns: TableColumn[]
  rows: TableRow[]
  step?: Step | null | undefined
  caption?: string
  /** Past this many rows the table scrolls rather than pushing the page down. */
  maxHeight?: number
  className?: string
}

export function DataTable({
  columns,
  rows,
  step = null,
  caption,
  maxHeight = 320,
  className,
}: DataTableProps): React.JSX.Element {
  // `${row} ${col}` for every highlighted cell this step.
  const lit = new Set<string>()
  for (const h of step?.highlight ?? []) {
    if (h.type === 'tableCell') lit.add(`${h.row} ${h.col}`)
  }

  return (
    <div className={className} style={{ overflow: 'auto', maxHeight }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        {caption === undefined ? null : (
          <caption
            className="tnt-muted"
            style={{ textAlign: 'left', fontSize: 12, paddingBottom: 6 }}
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{
                  position: 'sticky',
                  top: 0,
                  textAlign: 'left',
                  padding: '5px 9px',
                  fontSize: 12,
                  color: 'var(--tnt-text-muted)',
                  background: 'var(--tnt-surface)',
                  borderBottom: '1px solid var(--tnt-border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              data-row-key={row.key}
              data-role={row.role ?? 'idle'}
              style={{ borderBottom: '1px solid var(--tnt-border)', background: rowBackground(row.role) }}
            >
              {columns.map((column) => {
                const highlighted = lit.has(`${row.key} ${column.key}`)
                return (
                  <td
                    key={column.key}
                    data-cell={`${row.key} ${column.key}`}
                    data-lit={highlighted ? 'true' : undefined}
                    style={{
                      padding: '4px 9px',
                      fontFamily: column.mono === false ? 'inherit' : 'var(--tnt-mono)',
                      whiteSpace: 'nowrap',
                      background: highlighted ? 'var(--tnt-current-soft)' : undefined,
                      color: highlighted ? 'var(--tnt-current)' : undefined,
                      fontWeight: highlighted ? 600 : undefined,
                      transition: 'background 140ms ease',
                    }}
                  >
                    {row.cells[column.key] ?? ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <p className="tnt-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
          Nothing in the table yet.
        </p>
      ) : null}
    </div>
  )
}

function rowBackground(role: TableRow['role']): string | undefined {
  switch (role) {
    case 'current':
      return 'var(--tnt-current-soft)'
    case 'new':
      return 'var(--tnt-accepting-soft)'
    case 'dead':
      return 'var(--tnt-dead-soft)'
    default:
      return undefined
  }
}
