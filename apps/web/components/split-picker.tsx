'use client'

/**
 * Choosing w = xyz by pointing at it.
 *
 * Two boundaries on the string — the end of x and the end of y — with the
 * lemma's constraints enforced live: |xy| ≤ n keeps the second boundary inside
 * the window, |y| ≥ 1 keeps the two apart. The segments are coloured so the
 * student sees the split as the proof will describe it.
 */

import { useState } from 'react'

export interface SplitPickerProps {
  w: string
  n: number
  onSubmit: (split: { x: string; y: string; z: string }) => void
}

export function SplitPicker({ w, n, onSubmit }: SplitPickerProps): React.JSX.Element {
  const [xEnd, setXEnd] = useState(0)
  const [yEnd, setYEnd] = useState(1)

  const xyMax = Math.min(n, w.length)
  const clampedXEnd = Math.min(xEnd, xyMax - 1)
  const clampedYEnd = Math.max(clampedXEnd + 1, Math.min(yEnd, xyMax))

  const x = w.slice(0, clampedXEnd)
  const y = w.slice(clampedXEnd, clampedYEnd)
  const z = w.slice(clampedYEnd)

  return (
    <div className="tnt-card tnt-stack">
      <Segments x={x} y={y} z={z} />

      <label className="tnt-field">
        <span className="tnt-meta">End of x — currently |x| = {x.length}</span>
        <input
          type="range"
          min={0}
          max={xyMax - 1}
          value={clampedXEnd}
          onChange={(e) => setXEnd(Number(e.target.value))}
          aria-label="End of x"
          style={{ accentColor: 'var(--tnt-current)' }}
        />
      </label>

      <label className="tnt-field">
        <span className="tnt-meta">
          End of y — currently |y| = {y.length}, and |xy| = {x.length + y.length} ≤ {n}
        </span>
        <input
          type="range"
          min={clampedXEnd + 1}
          max={xyMax}
          value={clampedYEnd}
          onChange={(e) => setYEnd(Number(e.target.value))}
          aria-label="End of y"
          style={{ accentColor: 'var(--tnt-marked)' }}
        />
      </label>

      <button
        type="button"
        className="tnt-btn tnt-btn-primary"
        onClick={() => onSubmit({ x, y, z })}
        style={{ justifySelf: 'start' }}
      >
        Play this decomposition
      </button>
    </div>
  )
}

/** The string with its three segments coloured; used by the game panel too. */
export function Segments({ x, y, z }: { x: string; y: string; z: string }): React.JSX.Element {
  const piece = (text: string, label: string, color: string, background: string): React.JSX.Element => (
    <span
      aria-label={`${label} = ${text === '' ? 'the empty string' : text}`}
      style={{
        display: 'inline-grid',
        gap: 1,
        padding: 'var(--tnt-space-1) var(--tnt-space-2)',
        borderRadius: 'var(--tnt-radius)',
        border: `1px solid ${color}`,
        background,
        minWidth: 20,
        textAlign: 'center',
      }}
    >
      <code className="tnt-lg">{text === '' ? 'ε' : text}</code>
      <span className="tnt-xs" style={{ color }}>
        {label}
      </span>
    </span>
  )

  return (
    <div className="tnt-row tnt-row-tight">
      {piece(x, 'x', 'var(--tnt-text-muted)', 'var(--tnt-bg)')}
      {piece(y, 'y', 'var(--tnt-marked)', 'var(--tnt-surface)')}
      {piece(z, 'z', 'var(--tnt-text-muted)', 'var(--tnt-bg)')}
    </div>
  )
}
