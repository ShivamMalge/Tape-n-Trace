'use client'

/**
 * The board's chrome — design artboard 07's corners: the Undo / redo / pen
 * toolbar top right, and the chip picker that floats beside a drawn arc so
 * its symbols are chosen, never handwritten.
 */

import type { Read } from '@tape-n-trace/engine'
import { EPSILON_GLYPH } from '@tape-n-trace/ui'

export function BoardTools({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  tool,
  onTool,
  fullscreen,
  onFullscreen,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  tool: 'pen' | 'eraser'
  onTool: (tool: 'pen' | 'eraser') => void
  fullscreen: boolean
  onFullscreen: () => void
}): React.JSX.Element {
  return (
    <div className="tnt-board-tools" role="toolbar" aria-label="Board tools">
      <button type="button" className="tnt-board-btn tnt-board-btn-light" onClick={onUndo} disabled={!canUndo}>
        <span aria-hidden="true">↶</span>Undo
      </button>
      <button type="button" className="tnt-board-btn" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">
        <span aria-hidden="true">↷</span>
      </button>
      <button
        type="button"
        className="tnt-board-btn"
        aria-pressed={tool === 'eraser'}
        aria-label={tool === 'eraser' ? 'Eraser on — tap a state to rub it out' : 'Pen — switch to the eraser'}
        title={tool === 'eraser' ? 'Eraser: tap a state to rub it out' : 'Pen'}
        onClick={() => onTool(tool === 'pen' ? 'eraser' : 'pen')}
      >
        {tool === 'pen' ? (
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l3.5-.8L16 6.7a1.6 1.6 0 0 0 0-2.3l-.4-.4a1.6 1.6 0 0 0-2.3 0L3.8 13.5 3 17z" />
            <path d="M12 5.3l2.7 2.7" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7L2 10l5-6z" />
            <path d="M10 8l4 4M14 8l-4 4" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="tnt-board-btn"
        aria-pressed={fullscreen}
        aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
        title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
        onClick={onFullscreen}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {fullscreen ? (
            <path d="M7 3v4H3M13 3v4h4M7 17v-4H3M13 17v-4h4" />
          ) : (
            <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />
          )}
        </svg>
      </button>
    </div>
  )
}

/** The bottom-left pills: what is on the board, mark accepting, and clear. */
export function BoardStatus({
  states,
  arcs,
  marking,
  onMarking,
  onClear,
}: {
  states: number
  arcs: number
  marking: boolean
  onMarking: () => void
  onClear: () => void
}): React.JSX.Element {
  return (
    <div className="tnt-board-status">
      <span className="tnt-board-pill">
        {states} {states === 1 ? 'state' : 'states'} · {arcs} {arcs === 1 ? 'arc' : 'arcs'}
      </span>
      <button type="button" className="tnt-board-pill" aria-pressed={marking} onClick={onMarking}>
        mark accepting
      </button>
      <button type="button" className="tnt-board-pill" disabled={states === 0} onClick={onClear}>
        clear board
      </button>
    </div>
  )
}

export function BoardPicker({
  from,
  to,
  at,
  bounds,
  symbols,
  has,
  onToggle,
}: {
  from: string
  to: string
  at: { x: number; y: number }
  bounds: { width: number; height: number }
  symbols: Read[]
  has: (read: Read) => boolean
  onToggle: (read: Read) => void
}): React.JSX.Element {
  const label = symbols
    .filter((r) => has(r))
    .map((r) => r ?? EPSILON_GLYPH)
    .join(', ')
  return (
    <div
      className="tnt-board-picker"
      role="group"
      aria-label={`Label the arc from ${from} to ${to}`}
      style={{
        // Wide enough for a, b, 0, 1 and ε side by side (~330px).
        left: Math.min(Math.max(at.x - 165, 12), bounds.width - 340),
        top: Math.min(Math.max(at.y + 24, 12), bounds.height - 150),
      }}
    >
      <div className="tnt-board-chips">
        {symbols.map((read) => (
          <button key={read ?? 'eps'} type="button" className="tnt-board-chip" aria-pressed={has(read)} onClick={() => onToggle(read)}>
            {read ?? EPSILON_GLYPH}
          </button>
        ))}
      </div>
      <span className="tnt-board-picker-stem" aria-hidden="true" />
      <span className="tnt-board-picker-label">{label === '' ? '…' : label}</span>
    </div>
  )
}
