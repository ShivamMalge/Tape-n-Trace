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
}

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
}: AutomatonRendererProps): React.JSX.Element {
  const radius = mini ? MINI_NODE_RADIUS : NODE_RADIUS
  const layout = resolveLayout(machine, { radius })
  const view = boundsOf(layout, radius)
  const groups = groupTransitions(machine)
  const highlights = indexHighlights(step?.highlight)
  const accepting = new Set(machine.accepting)

  const startPoint = layout[machine.start]
  const startStub = startPoint === undefined ? null : startMarkerGeometry(startPoint, radius)

  // One marker per role, since an SVG marker cannot inherit its parent's stroke.
  const markerRoles = ['idle', 'taken', 'added', 'removed', 'candidate'] as const

  return (
    <svg
      className={className}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      width="100%"
      role="group"
      aria-label={describeMachine(machine)}
      data-tnt-theme={theme === 'auto' ? undefined : theme}
      style={{ fontFamily: 'var(--tnt-font)', maxWidth: '100%', display: 'block' }}
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
