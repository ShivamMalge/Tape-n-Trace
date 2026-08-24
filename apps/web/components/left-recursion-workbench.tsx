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
    <div className="tnt-stack">
      <GrammarInput initial={'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id'} onGrammar={onGrammar} />

      <div className="tnt-row">
        <button
          type="button"
          className="tnt-btn tnt-btn-primary"
          onClick={run}
          disabled={grammar === null}
        >
          Eliminate left recursion
        </button>
        {grammar === null ? null : (
          <span className="tnt-sm tnt-muted">
            This grammar {recursiveNow ? 'is' : 'is not'} left-recursive — checked on the
            leftmost-symbol graph, not by eye.
          </span>
        )}
      </div>

      <ValidationErrors errors={outcome.errors} />

      {outcome.trace !== null && snapshot !== undefined ? (
        <>
          <div className="tnt-panels">
            <section className="tnt-stack-sm">
              <h2 className="tnt-label" style={{ margin: 0 }}>
                Original
              </h2>
              <pre className="tnt-code-block" style={{ margin: 0 }}>
                {grammarToText(snapshot.source)}
              </pre>
            </section>

            <section className="tnt-stack-sm">
              <h2 className="tnt-label" style={{ margin: 0 }}>
                Rewritten so far{snapshot.current === null ? '' : ` — processing ${snapshot.current}`}
              </h2>
              <div className="tnt-card tnt-card-plain">
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

      <section className="tnt-card tnt-stack-sm">
        <h2 style={{ margin: 0 }}>The order trap</h2>
        <p style={{ margin: 0 }}>
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
