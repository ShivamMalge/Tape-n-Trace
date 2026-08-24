'use client'

/**
 * "Does this extended feature keep the language regular?" — Hopcroft §3.3.1.
 *
 * The honest answer for almost every UNIX operator is yes, and showing *the
 * rewrite* is what makes that convincing: a feature you can eliminate by hand
 * cannot have added power. The one exception is backreferences, and it is the
 * only entry here without a rewrite — because there is none.
 */

import { useState } from 'react'

interface Feature {
  id: string
  syntax: string
  meaning: string
  /** The §3.1 expression it is shorthand for, or `null` when there is none. */
  rewrite: string | null
  verdict: string
}

const FEATURES: Feature[] = [
  {
    id: 'plus',
    syntax: 'R+',
    meaning: 'One or more copies of R.',
    rewrite: 'RR*',
    verdict: 'Pure shorthand. Concatenate one copy in front of the star.',
  },
  {
    id: 'question',
    syntax: 'R?',
    meaning: 'R, or nothing.',
    rewrite: 'R + ε',
    verdict: 'Pure shorthand — a union with ε.',
  },
  {
    id: 'class',
    syntax: '[abc]',
    meaning: 'Any one of the listed characters.',
    rewrite: 'a + b + c',
    verdict: 'Pure shorthand. A class over a finite alphabet is a finite union.',
  },
  {
    id: 'range',
    syntax: '[0-9]',
    meaning: 'Any character in the range.',
    rewrite: '0 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9',
    verdict: 'Pure shorthand. The alphabet is finite, so the range is a finite union.',
  },
  {
    id: 'dot',
    syntax: '.',
    meaning: 'Any single character.',
    rewrite: 'the union of every symbol in Σ',
    verdict: 'Pure shorthand, for the same reason a class is.',
  },
  {
    id: 'bounded',
    syntax: 'R{2,4}',
    meaning: 'Between two and four copies of R.',
    rewrite: 'RR + RRR + RRRR',
    verdict: 'Pure shorthand. The bound is a constant, so it expands to a finite union.',
  },
  {
    id: 'complement-class',
    syntax: '[^a]',
    meaning: 'Any character except a.',
    rewrite: 'the union of every symbol of Σ other than a',
    verdict: 'Pure shorthand — and a reminder that the regular languages are closed under complement.',
  },
  {
    id: 'intersection',
    syntax: 'R & S',
    meaning: 'Strings matching both. Not a UNIX operator, but often wanted.',
    rewrite: 'no short rewrite, but the language is still regular',
    verdict:
      'Keeps it regular — that is the closure result of §4.2.1 — but there is no small expression for it. Build it in the closure lab instead.',
  },
  {
    id: 'backreference',
    syntax: '(R)\\1',
    meaning: 'Whatever R matched, matched again — the *same* text, not merely the same shape.',
    rewrite: null,
    verdict:
      'This one is not shorthand. It describes {ww}, which the pumping lemma shows is not regular. A tool advertising "regular expressions" with backreferences is not implementing regular expressions at all — it is doing backtracking search, which is also why those patterns can take exponential time.',
  },
]

export function ExtendedFeatures(): React.JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <ul className="tnt-stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {FEATURES.map((feature) => {
        const open = openId === feature.id
        const regular = feature.rewrite !== null

        return (
          <li key={feature.id}>
            {/* A disclosure, not a toggle: the open state hangs off
                `aria-expanded`, which the primitives do not style, so the tint
                is set here — and only when open, leaving `:hover` alone. */}
            <button
              type="button"
              className="tnt-btn"
              onClick={() => setOpenId(open ? null : feature.id)}
              aria-expanded={open}
              style={{
                width: '100%',
                textAlign: 'left',
                alignItems: 'baseline',
                gap: 'var(--tnt-space-3)',
                ...(open ? { background: 'var(--tnt-surface)' } : {}),
              }}
            >
              <code style={{ minWidth: 82 }}>{feature.syntax}</code>
              <span style={{ flex: 1 }}>{feature.meaning}</span>
              <span
                className="tnt-xs"
                style={{
                  whiteSpace: 'nowrap',
                  color: regular ? 'var(--tnt-accepting)' : 'var(--tnt-marked)',
                }}
              >
                {regular ? 'still regular' : 'NOT regular'}
              </span>
            </button>

            {open ? (
              <div
                className="tnt-card tnt-stack-sm"
                style={{ marginTop: 'var(--tnt-space-1)', background: 'var(--tnt-bg)' }}
              >
                {feature.rewrite === null ? null : (
                  <p style={{ margin: 0 }}>
                    Shorthand for <code>{feature.rewrite}</code>
                  </p>
                )}
                <p style={{ margin: 0 }}>{feature.verdict}</p>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
