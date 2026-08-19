/**
 * One drawn edge between two distinct states.
 *
 * An edge may stand for several transitions — §7 merges parallel edges into one
 * line with a comma-joined label. It lights up if *any* transition it stands for
 * is highlighted, which is why `edgeRole` reduces the group rather than the
 * component picking one.
 */

import { memo } from 'react'
import type { Point } from '@tape-n-trace/engine'
import { edgeGeometry, type EdgeGroup } from './geometry.js'
import { transitionColor, type TransitionRole } from './highlights.js'

export interface TransitionEdgeProps {
  group: EdgeGroup
  from: Point
  to: Point
  radius: number
  role?: TransitionRole | undefined
  mini?: boolean
  markerId: string
  onSelect?: ((group: EdgeGroup) => void) | undefined
}

function TransitionEdgeImpl({
  group,
  from,
  to,
  radius,
  role,
  mini = false,
  markerId,
  onSelect,
}: TransitionEdgeProps): React.JSX.Element {
  const geometry = edgeGeometry(from, to, radius, group.bowed)
  const color = transitionColor(role)
  const width = role === undefined ? (mini ? 1.2 : 1.6) : mini ? 2 : 2.4

  return (
    <g
      className="tnt-edge tnt-animated"
      data-transition-ids={group.ids.join(' ')}
      data-role={role ?? 'idle'}
      role="img"
      aria-label={`Transition from ${group.from} to ${group.to} on ${group.label}${
        role === undefined ? '' : `, ${role}`
      }`}
      onClick={onSelect === undefined ? undefined : () => onSelect(group)}
      style={{ cursor: onSelect === undefined ? 'default' : 'pointer' }}
    >
      {/* A fat transparent path under the visible one, so clicking a 1.6px line
          is possible with a mouse and comfortable on a touchscreen. */}
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
          {/* A halo so the label stays readable where it crosses its own line. */}
          <tspan stroke="var(--tnt-bg)" strokeWidth={3.5} paintOrder="stroke">
            {group.label}
          </tspan>
        </text>
      )}
    </g>
  )
}

/**
 * Memoised because an edge's appearance depends only on its own props, and scrubbing a trace re-renders the whole
 * diagram once per step while only one or two elements actually change.
 * The geometry caches keep the object props identical across those renders,
 * so this comparison succeeds rather than being defeated by fresh objects.
 */
export const TransitionEdge = memo(TransitionEdgeImpl)
