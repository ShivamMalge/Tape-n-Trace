'use client'

/**
 * CFG → PDA, §6.3.1 — the one-state construction, then the machine run live.
 *
 * Each production becomes an expansion move as its step plays; afterwards the
 * built PDA is a real simulator, so "the stack is the leftmost derivation" can
 * be watched on an input rather than read as a slogan.
 */

import { useMemo, useState } from 'react'
import { cfgToPDA, generatedStrings, isOk } from '@tape-n-trace/engine'
import type { CFG, CfgToPdaTrace, PDA } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { GrammarInput, ProductionList } from './grammar-input'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { PdaRunner } from './pda-runner'
import { usePlayback } from '../lib/use-playback'
import { pdaToDrawable } from '../lib/pda-drawable'

export function CfgToPdaWorkbench(): React.JSX.Element {
  const [grammar, setGrammar] = useState<CFG | null>(null)

  const outcome = useMemo(() => {
    if (grammar === null) return { trace: null, errors: [] }
    const result = cfgToPDA(grammar)
    return isOk(result)
      ? { trace: result.value as CfgToPdaTrace, errors: [] }
      : { trace: null, errors: result.errors }
  }, [grammar])

  const trace = outcome.trace
  const playback = usePlayback(trace)
  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot ?? null

  const litIndices = useMemo(() => {
    const lit = new Set<number>()
    for (const h of step?.highlight ?? []) {
      if (h.type === 'production') lit.add(h.index)
    }
    return lit
  }, [step])

  const machine = trace === null || trace.result.type !== 'machine' ? null : (trace.result.machine as PDA)
  const suggested = useMemo(() => {
    if (grammar === null || machine === null) return []
    // A taste of L(G), shortest first — the runner's chips.
    return [...generatedStrings(grammar, 5)].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 5)
  }, [grammar, machine])

  return (
    <div className="tnt-stack">
      <GrammarInput onGrammar={(g) => setGrammar(g)} />
      <ValidationErrors errors={outcome.errors} />

      {snapshot === null ? null : (
        <div className="tnt-panels">
          <section>
            <h2>The productions</h2>
            <div className="tnt-card tnt-card-plain">
              <ProductionList grammar={snapshot.grammar} litIndices={litIndices} />
            </div>
          </section>
          <section>
            <h2>The one-state PDA</h2>
            <div className="tnt-card tnt-card-plain">
              <AutomatonRenderer machine={pdaToDrawable(snapshot.target)} step={step} instanceId="cfg-pda" />
            </div>
          </section>
        </div>
      )}

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

      {machine === null ? null : (
        <section aria-label="Run the machine it built">
          <h2>Run the machine it built</h2>
          <p className="tnt-sm tnt-muted" style={{ marginTop: 0 }}>
            Accepts by empty stack. Watch the stack: a variable on top is expanded by guessing a
            production, a terminal on top must match the input — the stack is the unmatched tail of
            a leftmost derivation. (Type inputs symbol by symbol; multi-character terminals like{' '}
            <code className="tnt-code">id</code> cannot be typed into the run box.)
          </p>
          <PdaRunner key={JSON.stringify(machine.startStack) + machine.transitions.length} machine={machine} suggested={suggested} />
        </section>
      )}
    </div>
  )
}
