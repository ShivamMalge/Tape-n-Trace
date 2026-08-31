/**
 * A Turing-machine tape — design artboard 02's tape card: a row of head
 * markers, a contiguous run of 46 × 52 mono cells with the scanned cell
 * tinted and ringed in the current colour, and the state written beneath the
 * head the way an ID writes it beside the scanned cell.
 *
 * The tape is infinite; what is drawn is a window of it. Two conventions are
 * offered because lecturers teach both: **head-fixed** keeps the head in the
 * middle and scrolls the tape under it, **tape-fixed** keeps the cells where
 * they are and walks the head along them, paging only when the head leaves
 * the window.
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

export function TapeStrip({
  tape,
  blank,
  radius = 6,
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
      className={className === undefined ? 'tnt-tape' : `tnt-tape ${className}`}
      role="group"
      aria-label={`${label}: head on cell ${tape.head} reading ${scanned}${state === undefined ? '' : `, in state ${state}`}`}
    >
      <div className="tnt-tape-heads" aria-hidden="true">
        {positions.map((position) => (
          <span key={position} className="tnt-tape-head" data-on={position === tape.head ? 'true' : undefined}>
            ▼
          </span>
        ))}
      </div>

      <div className="tnt-tape-cells">
        {positions.map((position) => {
          const symbol = cellAt(position)
          const isHead = position === tape.head
          const rows = trackSeparator === undefined ? [symbol] : symbol.split(trackSeparator)
          return (
            <div
              key={position}
              className="tnt-tape-cell"
              data-position={position}
              data-head={isHead ? 'true' : undefined}
              data-written={written.has(position) ? 'true' : undefined}
              data-blank={symbol === blank ? 'true' : undefined}
            >
              {rows.map((row, r) => (
                <span key={r} className="tnt-tape-row">
                  {formatRow === undefined ? row : formatRow(row)}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      <figcaption className="tnt-tape-under">
        {positions.map((position) => (
          <span key={position} className="tnt-tape-state" data-on={position === tape.head ? 'true' : undefined}>
            {position === tape.head ? (state ?? '') : ''}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
