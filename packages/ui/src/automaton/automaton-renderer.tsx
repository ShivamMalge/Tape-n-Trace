/**
 * The automaton renderer — architecture.md §10.1.
 *
 * `(machine, step) → SVG`. It fetches nothing, calls no engine function, holds
 * no state and runs no effects. Everything it draws was decided upstream: the
 * engine chose the highlights, the controller chose the step.
 *
 * That purity is not tidiness for its own sake. It is what lets the notebook
 * bridge mount this same component against a trace that arrived over an
 * anywidget traitlet, with no engine on that side at all.
 */

import type { FiniteAutomaton, Step, StateId } from '@tape-n-trace/engine'
import { groupTransitions, MINI_NODE_RADIUS, NODE_RADIUS, startMarkerGeometry } from './geometry.js'
import type { EdgeGroup } from './geometry.js'
import { boundsOf, resolveLayout } from './layout.js'
import type { ViewBox } from './layout.js'
import { edgeRole, indexHighlights } from './highlights.js'
import { StateNode } from './state-node.js'
import { TransitionEdge } from './transition-edge.js'
import { SelfLoop } from './self-loop.js'

export interface AutomatonRendererProps {
  machine: FiniteAutomaton
  /** The step to draw. `null` draws the machine at rest, with no highlights. */
  step?: Step | null | undefined
  mini?: boolean
  theme?: 'light' | 'dark' | 'auto'
  /** Distinguishes this instance's SVG defs when several render on one page. */
  instanceId?: string
  selectedState?: StateId | null
  onSelectState?: ((id: StateId) => void) | undefined
  onSelectEdge?: ((group: EdgeGroup) => void) | undefined
  className?: string

  /**
   * Editing hooks. The renderer forwards these to the `<svg>` and does nothing
   * else with them: it stays a pure function of props, and the editor reads what
   * was hit from the `data-` attributes below via `coords.ts`. Adding a callback
   * per element instead would put editing policy inside the renderer, which is
   * the retrofit §10.1 exists to avoid.
   */
  svgRef?: React.Ref<SVGSVGElement>
  /**
   * The least area the view box covers, in machine units, centred on the
   * machine. An editing canvas sets this so a one-state machine is drawn in a
   * working area with room to add the next state, rather than filling the card.
   */
  minView?: { width: number; height: number } | undefined
  /**
   * The most the diagram may be scaled up from its own coordinates. The web
   * app's cards take the default; a notebook cell asks for less, because a
   * diagram there sits among prose rather than being the page.
   */
  maxScale?: number | undefined
  onPointerDown?: React.PointerEventHandler<SVGSVGElement> | undefined
  onPointerMove?: React.PointerEventHandler<SVGSVGElement> | undefined
  onPointerUp?: React.PointerEventHandler<SVGSVGElement> | undefined
  onDoubleClick?: React.MouseEventHandler<SVGSVGElement> | undefined
  onContextMenu?: React.MouseEventHandler<SVGSVGElement> | undefined
  /** Drawn last, above everything — the editor's in-progress edge, for instance. */
  overlay?: React.ReactNode
}

/** Grow a view box to at least `min`, keeping the machine centred in it. */
function widen(view: ViewBox, min: { width: number; height: number } | undefined): ViewBox {
  if (min === undefined) return view
  const width = Math.max(view.width, min.width)
  const height = Math.max(view.height, min.height)
  return { x: view.x - (width - view.width) / 2, y: view.y - (height - view.height) / 2, width, height }
}

/** The most a diagram may be scaled up from its own coordinates (design artboard 02's 640-wide viewBox in a ~690px card is ~1.1×). */
const MAX_SCALE = 1.5

export function AutomatonRenderer({
  machine,
  step = null,
  mini = false,
  theme = 'auto',
  instanceId = 'tnt',
  selectedState = null,
  onSelectState,
  onSelectEdge,
  className,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onContextMenu,
  overlay,
  minView,
  maxScale = MAX_SCALE,
}: AutomatonRendererProps): React.JSX.Element {
  const radius = mini ? MINI_NODE_RADIUS : NODE_RADIUS
  const layout = resolveLayout(machine, { radius })
  const view = widen(boundsOf(layout, radius), minView)
  const groups = groupTransitions(machine)
  const highlights = indexHighlights(step?.highlight)
  const accepting = new Set(machine.accepting)

  const startPoint = layout[machine.start]
  const startStub = startPoint === undefined ? null : startMarkerGeometry(startPoint, radius)

  // One marker per role, since an SVG marker cannot inherit its parent's stroke.
  const markerRoles = ['idle', 'taken', 'added', 'removed', 'candidate'] as const

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      width="100%"
      role="group"
      aria-label={describeMachine(machine)}
      data-tnt-theme={theme === 'auto' ? undefined : theme}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        fontFamily: 'var(--tnt-font)',
        /*
         * A diagram fills its card but never scales past MAX_SCALE× its own
         * geometry — a two-state machine in a wide card stays a diagram, not a
         * poster. An editing canvas (one with pointer handlers) keeps the full
         * width: the empty space is where the next state is drawn.
         */
        maxWidth: onPointerDown === undefined ? `min(100%, ${Math.round(view.width * maxScale)}px)` : '100%',
        display: 'block',
        margin: '0 auto',
        touchAction: onPointerDown === undefined ? undefined : 'none',
      }}
    >
      <defs>
        {markerRoles.map((role) => (
          <marker
            key={role}
            id={`${instanceId}-arrow-${role}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={arrowFill(role)} />
          </marker>
        ))}
      </defs>

      {/* Edges first, so nodes sit on top of the lines that meet them. */}
      <g className="tnt-edges">
        {groups.map((group) => {
          const role = edgeRole(group.ids, highlights)
          const markerId = `${instanceId}-arrow-${role ?? 'idle'}`
          const from = layout[group.from]
          const to = layout[group.to]
          if (from === undefined || to === undefined) return null

          return group.isSelfLoop ? (
            <SelfLoop
              key={group.ids.join('|')}
              group={group}
              center={from}
              radius={radius}
              role={role}
              mini={mini}
              markerId={markerId}
              onSelect={onSelectEdge}
            />
          ) : (
            <TransitionEdge
              key={group.ids.join('|')}
              group={group}
              from={from}
              to={to}
              radius={radius}
              role={role}
              mini={mini}
              markerId={markerId}
              onSelect={onSelectEdge}
            />
          )
        })}
      </g>

      {/* The stub arrow that marks the start state. Drawn from the machine, not
          from a highlight, so it is present whether or not a run is loaded. */}
      {startStub === null ? null : (
        <path
          className="tnt-start-marker"
          d={startStub.path}
          fill="none"
          stroke="var(--tnt-edge)"
          strokeWidth={mini ? 1.2 : 1.6}
          markerEnd={`url(#${instanceId}-arrow-idle)`}
        />
      )}

      <g className="tnt-states">
        {machine.states.map((id) => {
          const at = layout[id]
          if (at === undefined) return null
          return (
            <StateNode
              key={id}
              id={id}
              x={at.x}
              y={at.y}
              radius={radius}
              accepting={accepting.has(id)}
              isStart={id === machine.start}
              role={highlights.states.get(id)}
              mini={mini}
              selected={selectedState === id}
              onSelect={onSelectState}
            />
          )
        })}
      </g>

      {overlay}
    </svg>
  )
}

function arrowFill(role: 'idle' | 'taken' | 'added' | 'removed' | 'candidate'): string {
  switch (role) {
    case 'taken':
      return 'var(--tnt-taken)'
    case 'added':
      return 'var(--tnt-new)'
    case 'removed':
      return 'var(--tnt-dead)'
    case 'candidate':
      return 'var(--tnt-candidate)'
    default:
      return 'var(--tnt-edge)'
  }
}

/** A one-sentence summary for a reader who cannot see the diagram. */
function describeMachine(machine: FiniteAutomaton): string {
  const kind = machine.kind === 'ENFA' ? 'ε-NFA' : machine.kind
  const accepting =
    machine.accepting.length === 0
      ? 'no accepting states'
      : `accepting ${machine.accepting.join(', ')}`
  return `${kind} with ${machine.states.length} states over the alphabet {${machine.alphabet.join(', ')}}, starting at ${machine.start}, ${accepting}.`
}
