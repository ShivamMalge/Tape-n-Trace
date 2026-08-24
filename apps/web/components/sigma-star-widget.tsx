'use client'

/**
 * "Generate all strings of length ≤ k" — Hopcroft §1.5.
 *
 * The point is the count as much as the list: |Σ*| up to k grows as |Σ|^k, and
 * seeing 2,047 strings appear for a two-symbol alphabet at k = 10 is what makes
 * "Σ* is infinite" stop being a sentence to memorise.
 */

import { useMemo, useState } from 'react'
import { countUpTo, displayWord, enumerateUpTo } from '@tape-n-trace/engine'

const MAX_K = 12

export function SigmaStarWidget(): React.JSX.Element {
  const [alphabetText, setAlphabetText] = useState('0,1')
  const [k, setK] = useState(3)

  // A comma-separated alphabet, deduplicated and with blanks dropped — the
  // empty string is not a symbol, and validation would reject it downstream.
  const alphabet = useMemo(
    () => [...new Set(alphabetText.split(',').map((s) => s.trim()).filter((s) => s !== ''))],
    [alphabetText],
  )

  const enumeration = useMemo(() => enumerateUpTo(alphabet, k, { limit: 512 }), [alphabet, k])

  return (
    <section className="tnt-card tnt-stack">
      <div className="tnt-row tnt-row-end">
        <label className="tnt-field">
          <span className="tnt-muted">Alphabet Σ (comma separated)</span>
          <input
            value={alphabetText}
            onChange={(event) => setAlphabetText(event.target.value)}
            spellCheck={false}
            className="tnt-input tnt-input-mono"
            style={{ width: 160 }}
          />
        </label>

        <label className="tnt-field">
          <span className="tnt-muted">Maximum length k = {k}</span>
          <input
            type="range"
            min={0}
            max={MAX_K}
            value={k}
            onChange={(event) => setK(Number(event.target.value))}
            style={{ accentColor: 'var(--tnt-current)', width: 200 }}
          />
        </label>
      </div>

      {alphabet.length === 0 ? (
        <p className="tnt-muted" style={{ margin: 0 }}>
          An empty alphabet has only one string over it: ε. Add a symbol to see more.
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          <strong>{countUpTo(alphabet.length, k).toLocaleString('en')}</strong> strings of length at most{' '}
          {k} over an alphabet of {alphabet.length}{' '}
          {alphabet.length === 1 ? 'symbol' : 'symbols'}.{' '}
          <span className="tnt-muted">
            |Σ<sup>≤k</sup>| = 1 + |Σ| + |Σ|² + … + |Σ|<sup>k</sup>
          </span>
        </p>
      )}

      <ol
        aria-label={`Strings of length at most ${k}`}
        className="tnt-row tnt-row-tight"
        style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 220, overflowY: 'auto' }}
      >
        {enumeration.words.map((word, i) => (
          <li
            key={i}
            className="tnt-mono tnt-sm"
            style={{
              padding: '2px var(--tnt-space-2)',
              borderRadius: 'var(--tnt-radius)',
              border: '1px solid var(--tnt-border)',
              background: word.length === 0 ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
            }}
          >
            {displayWord(word)}
          </li>
        ))}
      </ol>

      {enumeration.truncated === undefined ? null : (
        <p className="tnt-meta" style={{ margin: 0 }}>
          {enumeration.truncated.reason}
        </p>
      )}
    </section>
  )
}
