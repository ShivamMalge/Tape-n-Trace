'use client'

/**
 * Left recursion elimination, stepped — phases.md P1.3.
 *
 * One step per variable in order: substitutions in, immediate elimination out,
 * new primed variable named canonically. The docs panel carries the warning the
 * phase spec insists on: this transformation *introduces* ε-productions, the
 * simplification pipeline removes them, and doing the two in the wrong order is
 * the classic lost-marks mistake.
 */

import { useCallback, useMemo, useState } from 'react'
import { eliminateLeftRecursion, grammarToText, isLeftRecursive, isOk } from '@tape-n-trace/engine'
import type { CFG, LeftRecursionSnapshot, Trace, ValidationError } from '@tape-n-trace/engine'
import { TransportBar } from '@tape-n-trace/ui'
import { GrammarInput, ProductionList } from './grammar-input'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { usePlayback } from '../lib/use-playback'

export function LeftRecursionWorkbench(): React.JSX.Element {
  const [grammar, setGrammar] = useState<CFG | null>(null)
  const [outcome, setOutcome] = useState<{ trace: Trace | null; errors: ValidationError[] }>({
    trace: null,
    errors: [],
  })

  const onGrammar = useCallback((next: CFG | null) => {
    setGrammar(next)
    setOutcome({ trace: null, errors: [] })
  }, [])

  const run = (): void => {
    if (grammar === null) return
    const result = eliminateLeftRecursion(grammar)
    setOutcome(
      isOk(result) ? { trace: result.value as Trace, errors: [] } : { trace: null, errors: result.errors },
    )
  }

  const playback = usePlayback(outcome.trace)
  const step = outcome.trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot as LeftRecursionSnapshot | undefined

  const lit = useMemo(() => {
    const set = new Set<number>()
    for (const h of step?.highlight ?? []) {
      if (h.type === 'production') set.add(h.index)
    }
    return set
  }, [step])

  const recursiveNow = grammar !== null && isLeftRecursive(grammar)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <GrammarInput initial={'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id'} onGrammar={onGrammar} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={run}
          disabled={grammar === null}
          style={{
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
          Eliminate left recursion
        </button>
        {grammar === null ? null : (
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            This grammar {recursiveNow ? 'is' : 'is not'} left-recursive — checked on the
            leftmost-symbol graph, not by eye.
          </span>
        )}
      </div>

      <ValidationErrors errors={outcome.errors} />

      {outcome.trace !== null && snapshot !== undefined ? (
        <>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
            <section style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Original
              </h2>
              <pre className="tnt-card" style={{ margin: 0, background: 'var(--tnt-bg)', fontSize: 14, fontFamily: 'var(--tnt-mono)' }}>
                {grammarToText(snapshot.source)}
              </pre>
            </section>

            <section style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Rewritten so far{snapshot.current === null ? '' : ` — processing ${snapshot.current}`}
              </h2>
              <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
                <ProductionList grammar={snapshot.grammar} litIndices={lit} />
              </div>
            </section>
          </div>

          <TransportBar
            stepIndex={playback.stepIndex}
            stepCount={playback.stepCount}
            playing={playback.playing}
            speed={playback.speed}
            onStepChange={playback.setStepIndex}
            onPlayingChange={playback.setPlaying}
            onSpeedChange={playback.setSpeed}
            narration={step?.narration}
          />

          <NarrationPanel step={step} />
        </>
      ) : null}

      <section className="tnt-card" style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ fontSize: 14, margin: 0 }}>The order trap</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          Left recursion elimination <strong>introduces ε-productions</strong> — every new primed
          variable gets one. The grammar-simplification pipeline (arriving with Module 4's tools)
          removes ε-productions, and the two transformations are taught in different modules, so it is
          easy to run them in the wrong order: ε-removal first would hand this algorithm input it
          refuses. Eliminate left recursion first, clean up ε afterwards.
        </p>
      </section>
    </div>
  )
}
