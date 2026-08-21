'use client'

/**
 * The `h : Σ → Δ*` editor.
 *
 * One row per symbol of the alphabet, because a homomorphism must be **total** —
 * leaving a symbol out is not "map it to itself", it is an incomplete function,
 * and the engine says so. Giving every symbol a row makes that structural rather
 * than something to remember.
 *
 * An empty box means ε, which is legal and is the case worth showing: erasing a
 * symbol is what makes homomorphism interesting rather than a renaming.
 */

import type { Homomorphism } from '@tape-n-trace/engine'
import type { Sym } from '@tape-n-trace/engine'

export interface HomomorphismEditorProps {
  alphabet: readonly Sym[]
  value: Homomorphism
  onChange: (next: Homomorphism) => void
  /** Shown when the images must be readable by the machine (h⁻¹). */
  imagesMustBeIn?: readonly Sym[] | undefined
}

export function HomomorphismEditor({
  alphabet,
  value,
  onChange,
  imagesMustBeIn,
}: HomomorphismEditorProps): React.JSX.Element {
  const set = (symbol: Sym, text: string): void => {
    onChange({ ...value, [symbol]: [...text] })
  }

  return (
    <fieldset
      style={{
        border: '1px solid var(--tnt-border)',
        borderRadius: 'var(--tnt-radius)',
        padding: '10px 12px',
        margin: 0,
        display: 'grid',
        gap: 8,
      }}
    >
      <legend style={{ fontSize: 13, padding: '0 6px' }} className="tnt-muted">
        h : Σ → Δ*
      </legend>

      {alphabet.map((symbol) => {
        const image = value[symbol] ?? []
        const bad =
          imagesMustBeIn === undefined ? [] : image.filter((c) => !imagesMustBeIn.includes(c))

        return (
          <label key={symbol} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--tnt-mono)', fontSize: 14, minWidth: 62 }}>
              h({symbol}) =
            </span>
            <input
              value={image.join('')}
              onChange={(event) => set(symbol, event.target.value)}
              placeholder="ε"
              spellCheck={false}
              autoComplete="off"
              aria-label={`Image of ${symbol}`}
              aria-invalid={bad.length > 0}
              style={{
                fontFamily: 'var(--tnt-mono)',
                fontSize: 14,
                padding: '4px 7px',
                width: 120,
                borderRadius: 'var(--tnt-radius)',
                border: `1px solid ${bad.length > 0 ? 'var(--tnt-marked)' : 'var(--tnt-border)'}`,
                background: 'var(--tnt-bg)',
                color: 'var(--tnt-text)',
              }}
            />
            {image.length === 0 ? (
              <span className="tnt-muted" style={{ fontSize: 12 }}>
                erased
              </span>
            ) : null}
            {bad.length > 0 ? (
              <span style={{ fontSize: 12, color: 'var(--tnt-marked)' }}>
                the machine cannot read {bad.map((c) => `"${c}"`).join(', ')}
              </span>
            ) : null}
          </label>
        )
      })}

      <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
        {imagesMustBeIn === undefined
          ? 'Leave a box empty to map that symbol to ε. Every symbol needs an image, even an empty one.'
          : 'For h⁻¹ the images are read by the original machine, so they must be strings over its own alphabet.'}
      </p>
    </fieldset>
  )
}
