/**
 * One state of an automaton.
 *
 * Draws; does not decide. Which role a state carries this step was settled by
 * the engine and indexed by `highlights.ts` — this component turns a role into
 * a circle and a label, and nothing else.
 */

import { memo } from 'react'
import type { StateId } from '@tape-n-trace/engine'
import { ACCEPTING_INSET } from './geometry.js'
import { stateColor, stateFill, type StateRole } from './highlights.js'

export interface StateNodeProps {
  id: StateId
  x: number
  y: number
  radius: number
  accepting: boolean
  isStart: boolean
  role?: StateRole | undefined
  /** Compact mode: no label, thinner strokes. For thumbnails and inline figures. */
  mini?: boolean
  selected?: boolean
  onSelect?: ((id: StateId) => void) | undefined
}

function StateNodeImpl({
  id,
  x,
  y,
  radius,
  accepting,
  isStart,
  role,
  mini = false,
  selected = false,
  onSelect,
}: StateNodeProps): React.JSX.Element {
  const stroke = stateColor(role)
  const fill = stateFill(role)
  const strokeWidth = role === undefined ? (mini ? 1.4 : 1.8) : mini ? 2 : 2.6

  // Screen readers get the whole story in one sentence rather than a bare id.
  const description = [
    `State ${id}`,
    isStart ? 'start state' : null,
    accepting ? 'accepting state' : null,
    role === undefined ? null : roleInWords(role),
  ]
    .filter((part) => part !== null)
    .join(', ')

  return (
    <g
      className="tnt-state tnt-animated"
      data-state-id={id}
      data-role={role ?? 'idle'}
      role="img"
      aria-label={description}
      tabIndex={onSelect === undefined ? undefined : 0}
      onClick={onSelect === undefined ? undefined : () => onSelect(id)}
      onKeyDown={
        onSelect === undefined
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(id)
              }
            }
      }
      style={{ cursor: onSelect === undefined ? 'default' : 'pointer' }}
    >
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ transition: 'fill 140ms ease, stroke 140ms ease' }}
      />

      {/* The double circle that means "accepting" in every textbook. */}
      {accepting ? (
        <circle
          cx={x}
          cy={y}
          r={radius - ACCEPTING_INSET}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 0.75}
        />
      ) : null}

      {selected ? (
        <circle
          cx={x}
          cy={y}
          r={radius + 5}
          fill="none"
          stroke="var(--tnt-focus)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      ) : null}

      {mini ? null : (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelSize(id)}
          fontFamily="var(--tnt-mono)"
          fill={role === undefined ? 'var(--tnt-text)' : stroke}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {id}
        </text>
      )}
    </g>
  )
}

/**
 * Subset-construction names like `{q0,q1,q2}` are long and must still fit inside
 * the circle, so the label shrinks with length rather than overflowing it.
 */
function labelSize(id: StateId): number {
  if (id.length <= 3) return 13
  if (id.length <= 6) return 11
  if (id.length <= 10) return 9
  return 7.5
}

function roleInWords(role: StateRole): string {
  switch (role) {
    case 'current':
      return 'current'
    case 'dead':
      return 'this branch has died'
    case 'new':
      return 'newly added'
    case 'marked':
      return 'marked'
    case 'accepting':
      return 'accepting, run succeeded here'
    case 'start':
      return 'start'
  }
}

/**
 * Memoised because a state's appearance depends only on its own props, and scrubbing a trace re-renders the whole
 * diagram once per step while only one or two elements actually change.
 * The geometry caches keep the object props identical across those renders,
 * so this comparison succeeds rather than being defeated by fresh objects.
 */
export const StateNode = memo(StateNodeImpl)
