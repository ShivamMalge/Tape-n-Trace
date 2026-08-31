'use client'

/**
 * The board's drawing surface — design artboard 07's ink and chalk.
 *
 * Draws; does not decide. The controller says what the machine is, which
 * state is fresh, which are lit by the current step, and what ink is live or
 * left faint under the shape it became; this turns that into SVG at the
 * board's own radius, using the same geometry helpers as the app's renderer
 * so arcs and self-loops are the shapes students see everywhere else.
 */

import type { RefObject } from 'react'
import type { FiniteAutomaton, Point, StateId } from '@tape-n-trace/engine'
import { edgeGeometry, selfLoopGeometry, startMarkerGeometry, type EdgeGroup } from '@tape-n-trace/ui'
import { STATE_RADIUS, type PlacedState } from '../../lib/board-recognize'
import { pathOf, pretty } from './board-text'

export interface Ink {
  points: Point[]
  /** What it became, for the faint copy left under the recognised shape. */
  role: 'state' | 'arc' | 'other'
}

export interface Lit {
  states: Map<StateId, string>
  edges: Set<string>
}

export interface BoardCanvasProps {
  machine: FiniteAutomaton
  placed: PlacedState[]
  groups: EdgeGroup[]
  lit: Lit
  freshState: StateId | null
  lastInk: Ink | null
  drawing: Point[] | null
  size: { width: number; height: number }
  svgRef: RefObject<SVGSVGElement | null>
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void
  onPointerCancel: () => void
}

export function BoardCanvas({
  machine,
  placed,
  groups,
  lit,
  freshState,
  lastInk,
  drawing,
  size,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: BoardCanvasProps): React.JSX.Element {
  // Every position comes from `placed`, which fills in a spot for a state that
  // arrived without one; reading machine.layout here would drop its arrows.
  const at = new Map(placed.map((s) => [s.id, s.at]))
  const start = machine.states.length === 0 ? undefined : at.get(machine.start)
  const startMarker = start === undefined ? null : startMarkerGeometry(start, STATE_RADIUS)
  const tip = drawing?.[drawing.length - 1]

  return (
    <svg
      ref={svgRef}
      className="tnt-board-svg"
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="application"
      aria-label={`Classroom board with ${machine.states.length} states and ${groups.length} arcs. Draw a loop for a state, a stroke between states for an arc.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <defs>
        <marker id="board-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="tnt-board-arrowhead" />
        </marker>
        <marker id="board-arrow-lit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="tnt-board-arrowhead" data-lit="true" />
        </marker>
      </defs>

      {lastInk === null ? null : <path d={pathOf(lastInk.points)} className="tnt-board-ink" data-role={lastInk.role} />}

      {startMarker === null ? null : <path d={startMarker.path} className="tnt-board-edge" markerEnd="url(#board-arrow)" />}

      {groups.map((group) => {
        const from = at.get(group.from)
        const to = at.get(group.to)
        if (from === undefined || to === undefined) return null
        const g = group.isSelfLoop ? selfLoopGeometry(from, STATE_RADIUS) : edgeGeometry(from, to, STATE_RADIUS, group.bowed)
        const isLit = group.ids.some((id) => lit.edges.has(id))
        return (
          <g key={`${group.from}->${group.to}`} data-edge-ids={group.ids.join(' ')}>
            <path
              d={g.path}
              className="tnt-board-edge"
              data-lit={isLit ? 'true' : undefined}
              markerEnd={isLit ? 'url(#board-arrow-lit)' : 'url(#board-arrow)'}
            />
            <text x={g.label.x} y={g.label.y} className="tnt-board-edge-label" textAnchor="middle" dominantBaseline="central">
              {group.label}
            </text>
          </g>
        )
      })}

      {placed.map((s) => {
        const role = lit.states.get(s.id)
        const accepting = machine.accepting.includes(s.id)
        const description = [
          `State ${s.id}`,
          s.id === machine.start ? 'start state' : null,
          accepting ? 'accepting state' : null,
          role ?? null,
        ]
          .filter((p) => p !== null)
          .join(', ')
        return (
          <g
            key={s.id}
            className="tnt-board-state"
            data-state-id={s.id}
            data-role={role ?? (s.id === freshState ? 'fresh' : undefined)}
            role="img"
            aria-label={description}
          >
            <circle cx={s.at.x} cy={s.at.y} r={STATE_RADIUS} />
            {accepting ? <circle cx={s.at.x} cy={s.at.y} r={STATE_RADIUS - 12} data-ring="inner" /> : null}
            {s.id === freshState ? <circle cx={s.at.x} cy={s.at.y} r={STATE_RADIUS + 18} data-ring="halo" /> : null}
            <text x={s.at.x} y={s.at.y} textAnchor="middle" dominantBaseline="central">
              {pretty(s.id)}
            </text>
          </g>
        )
      })}

      {drawing === null || drawing.length < 2 || tip === undefined ? null : (
        <>
          <path d={pathOf(drawing)} className="tnt-board-ink" data-role="live" />
          <circle cx={tip.x} cy={tip.y} r={9} className="tnt-board-pen" />
        </>
      )}
    </svg>
  )
}
