'use client'

/**
 * The stack, drawn as the column of cells the blackboard version is.
 *
 * Top of stack at the top — the direction a push visually lands. The bottom
 * cell is tinted, because "is the bottom marker still down there?" is the
 * question both acceptance conversions turn on.
 */

import type { Sym } from '@tape-n-trace/engine'

export interface StackColumnProps {
  stack: readonly Sym[]
  label?: string
}

export function StackColumn({ stack, label = 'Stack' }: StackColumnProps): React.JSX.Element {
  return (
    <div role="img" aria-label={stack.length === 0 ? `${label}: empty` : `${label}, top first: ${stack.join(', ')}`}>
      <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-1)' }}>
        {label} <span>(top first)</span>
      </div>
      {stack.length === 0 ? (
        <div
          className="tnt-mono tnt-muted"
          style={{
            display: 'inline-block',
            padding: 'var(--tnt-space-2) var(--tnt-space-3)',
            border: '1px dashed var(--tnt-border)',
            borderRadius: 'var(--tnt-radius)',
          }}
        >
          ε — empty
        </div>
      ) : (
        // The cell geometry is the drawing, not the type scale: a fixed column
        // width and a 2px seam between cells, so the stack reads as a stack.
        <div style={{ display: 'inline-grid', gap: 2 }}>
          {stack.map((symbol, depth) => (
            <div
              key={depth}
              data-depth={depth}
              className="tnt-mono"
              style={{
                textAlign: 'center',
                minWidth: 44,
                padding: '4px 10px',
                border: '1px solid var(--tnt-border)',
                borderRadius: 'var(--tnt-radius-sm)',
                background: depth === stack.length - 1 ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
              }}
            >
              {symbol}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
