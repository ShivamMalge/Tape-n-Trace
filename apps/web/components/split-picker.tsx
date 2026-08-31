'use client'

/**
 * Choosing w = xyz by pointing at it — design artboard 05's "You · move 2"
 * card: the string as three underlined segments labelled x, y, z, and two
 * sliders for |x| and |y| with the lemma's constraints enforced live — |xy| ≤ n
 * keeps the second boundary inside the window, |y| ≥ 1 keeps the two apart.
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
    <div className="tnt-stack">
      <Segments x={x} y={y} z={z} />

      <div className="tnt-stack-sm">
        <label className="tnt-slider-row">
          <span className="tnt-slider-name">|x|</span>
          <input
            type="range"
            min={0}
            max={xyMax - 1}
            value={clampedXEnd}
            onChange={(e) => setXEnd(Number(e.target.value))}
            aria-label="End of x"
          />
          <span className="tnt-slider-value">{x.length}</span>
        </label>

        <label className="tnt-slider-row">
          <span className="tnt-slider-name">|y|</span>
          <input
            type="range"
            min={clampedXEnd + 1}
            max={xyMax}
            value={clampedYEnd}
            onChange={(e) => setYEnd(Number(e.target.value))}
            aria-label="End of y"
          />
          <span className="tnt-slider-value">{y.length}</span>
        </label>
        <span className="tnt-meta">
          |xy| = {x.length + y.length} ≤ {n}, y ≠ ε
        </span>
      </div>

      <div>
        <button type="button" className="tnt-btn tnt-btn-primary" onClick={() => onSubmit({ x, y, z })}>
          Play this decomposition
        </button>
      </div>
    </div>
  )
}

/** The string with its three segments underlined and labelled; the game panel uses it too. */
export function Segments({ x, y, z }: { x: string; y: string; z: string }): React.JSX.Element {
  const piece = (text: string, label: string): React.JSX.Element => (
    <span
      className="tnt-segment"
      data-segment={label}
      aria-label={`${label} = ${text === '' ? 'the empty string' : text}`}
    >
      <span className="tnt-segment-text">{text === '' ? 'ε' : text}</span>
      <span className="tnt-segment-label">{label}</span>
    </span>
  )

  return (
    <div className="tnt-segments">
      {piece(x, 'x')}
      {piece(y, 'y')}
      {piece(z, 'z')}
    </div>
  )
}
