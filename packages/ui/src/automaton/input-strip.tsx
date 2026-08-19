/**
 * The input string, with the head position marked.
 *
 * The engine emits `input` highlights carrying positions (§5), and without
 * somewhere to draw them a whole highlight kind would go unrendered. Deliberately
 * simple — the TM tape strip in P1.6 is a different component, because a tape is
 * writable, two-way and unbounded, and pretending they are the same thing would
 * cost more than it saves.
 */

import type { Step, Sym } from '@tape-n-trace/engine'
import { indexHighlights, type InputRole } from './highlights.js'

export interface InputStripProps {
  input: readonly Sym[]
  /** How many symbols have been consumed. */
  position: number
  step?: Step | null | undefined
  mini?: boolean
  className?: string
}

export function InputStrip({
  input,
  position,
  step = null,
  mini = false,
  className,
}: InputStripProps): React.JSX.Element {
  const highlights = indexHighlights(step?.highlight)

  if (input.length === 0) {
    return (
      <p className={className} style={{ ...baseStyle(mini), color: 'var(--tnt-text-muted)' }}>
        The input is the empty string.
      </p>
    )
  }

  return (
    <div
      className={className}
      role="group"
      aria-label={`Input ${input.join('')}, ${position} of ${input.length} symbols read`}
      style={{ ...baseStyle(mini), display: 'flex', gap: mini ? 2 : 4, flexWrap: 'wrap' }}
    >
      {input.map((symbol, i) => {
        const role = highlights.inputs.get(i) ?? implicitRole(i, position)
        return (
          <span
            key={i}
            className="tnt-input-cell tnt-animated"
            data-position={i}
            data-role={role}
            aria-hidden="true"
            style={cellStyle(role, mini)}
          >
            {symbol}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Positions the current step said nothing about still need to look right: a
 * symbol left of the head has been consumed, one at or right of it has not.
 */
function implicitRole(index: number, position: number): InputRole {
  return index < position ? 'consumed' : 'lookahead'
}

function baseStyle(mini: boolean): React.CSSProperties {
  return { fontFamily: 'var(--tnt-mono)', fontSize: mini ? 12 : 16, margin: 0 }
}

function cellStyle(role: InputRole, mini: boolean): React.CSSProperties {
  const size = mini ? 18 : 28
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: size,
    height: size,
    borderRadius: 'var(--tnt-radius)',
    border: '1px solid var(--tnt-border)',
    transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
  }

  switch (role) {
    case 'read':
      return {
        ...base,
        borderColor: 'var(--tnt-read)',
        background: 'var(--tnt-current-soft)',
        color: 'var(--tnt-read)',
        fontWeight: 600,
      }
    case 'consumed':
      return { ...base, color: 'var(--tnt-consumed)', background: 'var(--tnt-surface)' }
    default:
      return { ...base, color: 'var(--tnt-lookahead)', background: 'var(--tnt-bg)' }
  }
}
