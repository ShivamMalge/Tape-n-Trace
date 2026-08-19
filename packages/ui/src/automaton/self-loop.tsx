/**
 * A transition from a state back to itself.
 *
 * Its own component rather than a branch inside `TransitionEdge` because the
 * geometry shares nothing with a two-node edge: §7 fixes self-loops above the
 * node, and the label has to clear the arc rather than straddle a midpoint.
 */

import { memo } from 'react'
import type { Point } from '@tape-n-trace/engine'
import { selfLoopGeometry, type EdgeGroup } from './geometry.js'
import { transitionColor, type TransitionRole } from './highlights.js'

export interface SelfLoopProps {
  group: EdgeGroup
  center: Point
  radius: number
  role?: TransitionRole | undefined
  mini?: boolean
  markerId: string
  onSelect?: ((group: EdgeGroup) => void) | undefined
}

function SelfLoopImpl({
  group,
  center,
  radius,
  role,
  mini = false,
  markerId,
  onSelect,
}: SelfLoopProps): React.JSX.Element {
  const geometry = selfLoopGeometry(center, radius)
  const color = transitionColor(role)
  const width = role === undefined ? (mini ? 1.2 : 1.6) : mini ? 2 : 2.4

  return (
    <g
      className="tnt-edge tnt-self-loop tnt-animated"
      data-transition-ids={group.ids.join(' ')}
      data-role={role ?? 'idle'}
      role="img"
      aria-label={`Self-loop on ${group.from} reading ${group.label}${role === undefined ? '' : `, ${role}`}`}
      onClick={onSelect === undefined ? undefined : () => onSelect(group)}
      style={{ cursor: onSelect === undefined ? 'default' : 'pointer' }}
    >
      {onSelect === undefined ? null : (
        <path d={geometry.path} fill="none" stroke="transparent" strokeWidth={14} />
      )}

      <path
        d={geometry.path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        markerEnd={`url(#${markerId})`}
        style={{ transition: 'stroke 140ms ease' }}
      />

      {mini ? null : (
        <text
          x={geometry.label.x}
          y={geometry.label.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontFamily="var(--tnt-mono)"
          fill={role === undefined ? 'var(--tnt-label)' : color}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <tspan stroke="var(--tnt-bg)" strokeWidth={3.5} paintOrder="stroke">
            {group.label}
          </tspan>
        </text>
      )}
    </g>
  )
}

/**
 * Memoised because a self-loop's appearance depends only on its own props, and scrubbing a trace re-renders the whole
 * diagram once per step while only one or two elements actually change.
 * The geometry caches keep the object props identical across those renders,
 * so this comparison succeeds rather than being defeated by fresh objects.
 */
export const SelfLoop = memo(SelfLoopImpl)
