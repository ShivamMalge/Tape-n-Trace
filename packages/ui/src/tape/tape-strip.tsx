/**
 * A Turing-machine tape.
 *
 * The tape is infinite; what is drawn is a window of it. Two conventions are
 * offered because lecturers teach both: **head-fixed** keeps the head in the
 * middle and scrolls the tape under it, **tape-fixed** keeps the cells where
 * they are and walks the head along them, paging only when the head leaves
 * the window. The state is written under the head, the way the ID puts it
 * beside the scanned cell.
 *
 * A cell may hold several tracks (§8.3.2, and the many-tapes-to-one
 * construction): pass `trackSeparator` and the cell is drawn as stacked rows.
 */

import type { Step } from '@tape-n-trace/engine'

export interface TapeStripTape {
  cells: readonly string[]
  offset: number
  head: number
}

export interface TapeStripProps {
  tape: TapeStripTape
  blank: string
  /** Cells drawn on either side of the centre. */
  radius?: number
  mode?: 'head-fixed' | 'tape-fixed'
  step?: Step | null | undefined
  /** Which tape of the machine this is, for the step's tapeCell highlights. */
  tapeIndex?: number
  /** Written under the head, the way an ID writes the state beside the scanned cell. */
  state?: string | undefined
  /** Split each cell on this separator and stack the parts as tracks. */
  trackSeparator?: string | undefined
  /** Rewrite one track row for display (a head marker, say). */
  formatRow?: ((row: string) => string) | undefined
  label?: string
  className?: string
}

const CELL = 34

export function TapeStrip({
  tape,
  blank,
  radius = 8,
  mode = 'head-fixed',
  step = null,
  tapeIndex = 0,
  state,
  trackSeparator,
  formatRow,
  label = 'Tape',
  className,
}: TapeStripProps): React.JSX.Element {
  const width = 2 * radius + 1
  const page = Math.floor((tape.head + radius) / width)
  const start = mode === 'head-fixed' ? tape.head - radius : page * width - radius

  const written = new Set<number>()
  for (const h of step?.highlight ?? []) {
    if (h.type === 'tapeCell' && h.tape === tapeIndex && h.role === 'written') written.add(h.index)
  }

  const cellAt = (position: number): string => {
    const i = position - tape.offset
    return i >= 0 && i < tape.cells.length ? (tape.cells[i] as string) : blank
  }

  const positions = Array.from({ length: width }, (_, i) => start + i)
  const scanned = cellAt(tape.head)

  return (
    <figure
      className={className}
      role="group"
      aria-label={`${label}: head on cell ${tape.head} reading ${scanned}${state === undefined ? '' : `, in state ${state}`}`}
      style={{ margin: 0, overflowX: 'auto' }}
    >
      <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${width}, ${CELL}px)`, gap: 2, padding: '14px 2px 4px' }}>
        {positions.map((position) => {
          const symbol = cellAt(position)
          const isHead = position === tape.head
          const rows = trackSeparator === undefined ? [symbol] : symbol.split(trackSeparator)
          return (
            <div
              key={position}
              data-position={position}
              data-head={isHead ? 'true' : undefined}
              data-written={written.has(position) ? 'true' : undefined}
              style={{ position: 'relative', display: 'grid', gap: 1 }}
            >
              {isHead ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--tnt-current)',
                    lineHeight: 1,
                  }}
                >
                  ▼
                </span>
              ) : null}
              {rows.map((row, r) => (
                <span
                  key={r}
                  style={{
                    display: 'block',
                    height: CELL - 6,
                    lineHeight: `${CELL - 6}px`,
                    textAlign: 'center',
                    fontFamily: 'var(--tnt-mono)',
                    fontSize: 14,
                    border: isHead ? '2px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
                    borderRadius: 4,
                    background: written.has(position)
                      ? 'var(--tnt-accepting-soft)'
                      : symbol === blank
                        ? 'var(--tnt-bg)'
                        : 'var(--tnt-surface)',
                    color: symbol === blank ? 'var(--tnt-text-muted)' : 'var(--tnt-text)',
                  }}
                >
                  {formatRow === undefined ? row : formatRow(row)}
                </span>
              ))}
            </div>
          )
        })}
      </div>
      {state === undefined ? null : (
        <figcaption
          style={{
            fontFamily: 'var(--tnt-mono)',
            fontSize: 12,
            color: 'var(--tnt-current)',
            paddingLeft: 2 + (tape.head - start) * (CELL + 2),
          }}
        >
          {state}
        </figcaption>
      )}
    </figure>
  )
}
