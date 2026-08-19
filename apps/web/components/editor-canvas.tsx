'use client'

/**
 * The drawing surface.
 *
 * Pointer interaction only — this component decides what a gesture *means* and
 * calls back with an intention. It computes no machine and stores no machine;
 * the editor above it owns both.
 *
 * The gestures, per phases.md P0.2:
 *   click empty space   → add a state there
 *   drag state → state  → connect them (rubber band follows the pointer)
 *   drag state (Move)   → reposition it
 *   double-click state  → toggle accepting
 *   right-click state   → make it the start state
 *   click an edge       → edit its label
 *
 * Draw and Move are separate modes because dragging a state is ambiguous
 * otherwise: the same gesture would have to mean both "connect" and "reposition".
 * Holding Shift in Draw mode repositions, for anyone who would rather not switch.
 */

import { useRef, useState } from 'react'
import { AutomatonRenderer, eventPoint, stateAt, transitionsAt } from '@tape-n-trace/ui'
import type { FiniteAutomaton, Point, StateId, TransitionId } from '@tape-n-trace/engine'
import type { EditorMode } from './editor-toolbar'

export interface EditorCanvasProps {
  machine: FiniteAutomaton
  mode: EditorMode
  selected: StateId | null
  svgRef: React.RefObject<SVGSVGElement | null>
  onAddStateAt: (at: Point) => void
  onConnect: (from: StateId, to: StateId) => void
  onMoveState: (id: StateId, at: Point, settled: boolean) => void
  onToggleAccepting: (id: StateId) => void
  onSetStart: (id: StateId) => void
  onEditEdge: (ids: TransitionId[]) => void
  onSelect: (id: StateId | null) => void
}

type Gesture =
  | { kind: 'connect'; from: StateId; at: Point }
  | { kind: 'move'; id: StateId; moved: boolean }
  | null

export function EditorCanvas({
  machine,
  mode,
  selected,
  svgRef,
  onAddStateAt,
  onConnect,
  onMoveState,
  onToggleAccepting,
  onSetStart,
  onEditEdge,
  onSelect,
}: EditorCanvasProps): React.JSX.Element {
  const [gesture, setGesture] = useState<Gesture>(null)
  // Whether the pointer actually travelled. A drag that went nowhere is a click,
  // and should not be treated as a failed connection.
  const travelled = useRef(false)

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (event.button !== 0) return
    const id = stateAt(event.target)
    travelled.current = false

    if (id === null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    onSelect(id)

    const repositioning = mode === 'move' || event.shiftKey
    setGesture(
      repositioning
        ? { kind: 'move', id, moved: false }
        : { kind: 'connect', from: id, at: eventPoint(svgRef.current, event) ?? { x: 0, y: 0 } },
    )
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (gesture === null) return
    const at = eventPoint(svgRef.current, event)
    if (at === null) return
    travelled.current = true

    if (gesture.kind === 'connect') {
      setGesture({ ...gesture, at })
    } else {
      onMoveState(gesture.id, at, false)
      if (!gesture.moved) setGesture({ ...gesture, moved: true })
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>): void => {
    const current = gesture
    setGesture(null)

    if (current === null) {
      // A click that began and ended on empty canvas adds a state there.
      if (mode === 'draw' && stateAt(event.target) === null && transitionsAt(event.target) === null) {
        const at = eventPoint(svgRef.current, event)
        if (at !== null) onAddStateAt(at)
      }
      return
    }

    if (current.kind === 'move') {
      // Settle the drag into a single undo entry.
      const at = eventPoint(svgRef.current, event)
      if (at !== null && current.moved) onMoveState(current.id, at, true)
      return
    }

    const target = stateAt(event.target)
    // Releasing on the same state without moving is a plain selection, not a
    // request for a self-loop nobody asked for.
    if (target !== null && (target !== current.from || travelled.current)) {
      onConnect(current.from, target)
    }
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const ids = transitionsAt(event.target)
    if (ids !== null) onEditEdge(ids)
  }

  return (
    <div
      className="tnt-card"
      // Edge clicks are caught here rather than on the SVG so a drag that happens
      // to end over an edge does not also open its label editor.
      onClick={handleClick}
      style={{ background: 'var(--tnt-bg)', padding: 8, cursor: mode === 'move' ? 'grab' : 'crosshair' }}
    >
      <AutomatonRenderer
        machine={machine}
        svgRef={svgRef}
        instanceId="edit"
        selectedState={selected}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={(event) => {
          const id = stateAt(event.target)
          if (id !== null) onToggleAccepting(id)
        }}
        onContextMenu={(event) => {
          const id = stateAt(event.target)
          if (id === null) return
          event.preventDefault()
          onSetStart(id)
        }}
        overlay={
          gesture?.kind === 'connect' ? (
            <RubberBand machine={machine} from={gesture.from} to={gesture.at} />
          ) : null
        }
      />
    </div>
  )
}

/** The line that follows the pointer while a connection is being drawn. */
function RubberBand({
  machine,
  from,
  to,
}: {
  machine: FiniteAutomaton
  from: StateId
  to: Point
}): React.JSX.Element | null {
  const start = machine.layout?.[from]
  if (start === undefined) return null

  return (
    <g aria-hidden="true">
      <line
        x1={start.x}
        y1={start.y}
        x2={to.x}
        y2={to.y}
        stroke="var(--tnt-new)"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <circle cx={to.x} cy={to.y} r={3.5} fill="var(--tnt-new)" />
    </g>
  )
}
