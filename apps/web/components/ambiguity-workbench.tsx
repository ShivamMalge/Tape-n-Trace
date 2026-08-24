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
    <div className="tnt-stack">
      <GrammarInput initial="E -> E + E | E * E | ( E ) | id" onGrammar={onGrammar} />

      <button
        type="button"
        className="tnt-btn tnt-btn-primary"
        onClick={run}
        disabled={grammar === null}
        style={{ justifySelf: 'start' }}
      >
        Search for an ambiguous string
      </button>

      {result === null ? null : result.ambiguous ? (
        <section className="tnt-stack">
          <div
            role="status"
            className="tnt-card"
            style={{ borderColor: 'var(--tnt-marked)' }}
          >
            <strong style={{ color: 'var(--tnt-marked)' }}>
              Ambiguous — proven.
            </strong>{' '}
            <span>
              The string{' '}
              <code className="tnt-code">{result.witness.join(' ')}</code> has two distinct
              leftmost derivations, drawn below. One witness is a complete proof.
            </span>
          </div>

          <div className="tnt-panels">
            {result.trees.map((tree, i) => (
              <section key={i} className="tnt-stack-sm">
                <h2 className="tnt-label" style={{ margin: 0 }}>
                  Parse tree {i + 1}
                </h2>
                <div className="tnt-card tnt-scroll-x tnt-card-plain">
                  <ParseTree nodes={toRenderTree(tree)} />
                </div>
                <p className="tnt-sm tnt-muted tnt-mono" style={{ margin: 0 }}>
                  yield: {treeYield(tree).join(' ')}
                </p>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <div role="status" className="tnt-card tnt-stack-sm">
          <strong>No counterexample within bounds.</strong>
          <p style={{ margin: 0 }}>{result.note}</p>
        </div>
      )}

      <section className="tnt-card tnt-stack-sm">
        <h2 style={{ margin: 0 }}>Why the answers are asymmetric</h2>
        <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
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
