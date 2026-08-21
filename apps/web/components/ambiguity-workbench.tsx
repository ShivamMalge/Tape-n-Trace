'use client'

/**
 * The ambiguity detector — phases.md P1.3.
 *
 * A witness proves ambiguity outright: two different parse trees for one
 * string, drawn side by side. No witness proves nothing, and the result says
 * exactly that — inherent ambiguity is undecidable, so a bounded search is all
 * any tool can honestly offer.
 */

import { useCallback, useState } from 'react'
import { detectAmbiguity, isOk, treeYield } from '@tape-n-trace/engine'
import type { AmbiguityResult, CFG } from '@tape-n-trace/engine'
import { ParseTree } from '@tape-n-trace/ui'
import { GrammarInput } from './grammar-input'
import { toRenderTree } from './derivation-workbench'

export function AmbiguityWorkbench(): React.JSX.Element {
  const [grammar, setGrammar] = useState<CFG | null>(null)
  const [result, setResult] = useState<AmbiguityResult | null>(null)

  const onGrammar = useCallback((next: CFG | null) => {
    setGrammar(next)
    setResult(null)
  }, [])

  const run = (): void => {
    if (grammar === null) return
    const outcome = detectAmbiguity(grammar)
    if (isOk(outcome)) setResult(outcome.value)
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <GrammarInput initial="E -> E + E | E * E | ( E ) | id" onGrammar={onGrammar} />

      <button
        type="button"
        onClick={run}
        disabled={grammar === null}
        style={{
          justifySelf: 'start',
          padding: '9px 18px',
          borderRadius: 'var(--tnt-radius)',
          border: '1px solid var(--tnt-current)',
          background: 'var(--tnt-current)',
          color: '#fff',
          fontSize: 15,
          cursor: grammar === null ? 'not-allowed' : 'pointer',
          opacity: grammar === null ? 0.5 : 1,
        }}
      >
        Search for an ambiguous string
      </button>

      {result === null ? null : result.ambiguous ? (
        <section style={{ display: 'grid', gap: 12 }}>
          <div
            role="status"
            style={{
              padding: '11px 14px',
              borderRadius: 'var(--tnt-radius)',
              border: '1px solid var(--tnt-marked)',
              background: 'var(--tnt-surface)',
            }}
          >
            <strong style={{ color: 'var(--tnt-marked)', fontSize: 15 }}>
              Ambiguous — proven.
            </strong>{' '}
            <span style={{ fontSize: 14 }}>
              The string{' '}
              <code style={{ fontSize: 15 }}>{result.witness.join(' ')}</code> has two distinct
              leftmost derivations, drawn below. One witness is a complete proof.
            </span>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
            {result.trees.map((tree, i) => (
              <section key={i} style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Parse tree {i + 1}
                </h2>
                <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
                  <ParseTree nodes={toRenderTree(tree)} />
                </div>
                <p className="tnt-muted" style={{ margin: 0, fontSize: 13, fontFamily: 'var(--tnt-mono)' }}>
                  yield: {treeYield(tree).join(' ')}
                </p>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <div
          role="status"
          style={{
            padding: '11px 14px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-surface)',
            display: 'grid',
            gap: 6,
          }}
        >
          <strong style={{ fontSize: 15 }}>No counterexample within bounds.</strong>
          <p style={{ margin: 0, fontSize: 14 }}>{result.note}</p>
        </div>
      )}

      <section className="tnt-card" style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ fontSize: 14, margin: 0 }}>Why the answers are asymmetric</h2>
        <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
          Finding a string with two parse trees settles the question forever. Finding none settles
          nothing: whether a grammar is ambiguous is undecidable in general, and some languages are{' '}
          <em>inherently</em> ambiguous — every grammar for them is ambiguous (Hopcroft 2e §5.4.4) —
          so a bounded search is the strongest honest tool. Try the exam expression grammar preset:
          the ambiguity disappears under the rewrite, and the detector's answer changes shape with it.
        </p>
      </section>
    </div>
  )
}
