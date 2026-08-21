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
    <div className="tnt-card" style={{ display: 'grid', gap: 10 }}>
      <Segments x={x} y={y} z={z} />

      <label style={{ display: 'grid', gap: 3 }}>
        <span className="tnt-muted" style={{ fontSize: 12 }}>
          End of x — currently |x| = {x.length}
        </span>
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

      <label style={{ display: 'grid', gap: 3 }}>
        <span className="tnt-muted" style={{ fontSize: 12 }}>
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

      <button type="button" onClick={() => onSubmit({ x, y, z })} style={submit}>
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
        padding: '3px 6px',
        borderRadius: 'var(--tnt-radius)',
        border: `1px solid ${color}`,
        background,
        minWidth: 20,
        textAlign: 'center',
      }}
    >
      <code style={{ fontSize: 16 }}>{text === '' ? 'ε' : text}</code>
      <span style={{ fontSize: 10, color }}>{label}</span>
    </span>
  )

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {piece(x, 'x', 'var(--tnt-text-muted)', 'var(--tnt-bg)')}
      {piece(y, 'y', 'var(--tnt-marked)', 'var(--tnt-surface)')}
      {piece(z, 'z', 'var(--tnt-text-muted)', 'var(--tnt-bg)')}
    </div>
  )
}

const submit: React.CSSProperties = {
  justifySelf: 'start',
  padding: '7px 15px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-current)',
  background: 'var(--tnt-current)',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
}
