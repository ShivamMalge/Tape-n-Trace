'use client'

/**
 * The four-stage simplification pipeline, as a pipeline — Hopcroft 2e §7.1.
 *
 * The stages run in Theorem 7.14's safe order (ε-productions, unit
 * productions, useless symbols, then CNF), each fed the previous stage's
 * grammar, each with its own stepper and a before/after diff. The order is
 * the lesson: the book *teaches* useless symbols first but *prescribes* doing
 * them last, and the page says so where a student would otherwise get it
 * wrong. The useless stage also carries Example 7.1's wrong-order demo.
 */

import { useMemo, useState } from 'react'
import {
  eliminateEpsilon,
  eliminateUnit,
  eliminateUseless,
  generatedStrings,
  isCNF,
  isOk,
  productionToText,
  toCNF,
  wrongOrderUseless,
} from '@tape-n-trace/engine'
import type { CFG, Result, Trace, ValidationError } from '@tape-n-trace/engine'
import { TransportBar } from '@tape-n-trace/ui'
import { GrammarInput, ProductionList, type GrammarPreset } from './grammar-input'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { usePlayback } from '../lib/use-playback'
import { GrammarDiff, SymbolChips } from './grammar-diff'

export const PIPELINE_PRESETS: GrammarPreset[] = [
  { id: 'ex-7-1-2', title: 'Exercise 7.1.2', source: 'S -> A S B | ε\nA -> a A S | a\nB -> S b S | A | b b' },
  { id: 'example-7-8', title: 'Example 7.8 (ε-productions)', source: 'S -> A B\nA -> a A A | ε\nB -> b B B | ε' },
  // The book's B has no productions at all; here it has one that never
  // terminates, so the text form can say B exists. Same lesson, same residue.
  { id: 'example-7-1', title: 'Example 7.1 (useless symbols)', source: 'S -> A B | a\nA -> b\nB -> B b' },
  {
    id: 'expressions',
    title: 'The expression grammar (Examples 7.12, 7.15)',
    source: 'E -> E + T | T\nT -> T * F | F\nF -> I | ( E )\nI -> a | b | I a | I b | I 0 | I 1',
  },
  { id: 'ex-7-1-3', title: 'Exercise 7.1.3', source: 'S -> 0 A 0 | 1 B 1 | B B\nA -> C\nB -> S | A\nC -> S | ε' },
]

interface Stage {
  id: 'epsilon' | 'unit' | 'useless' | 'cnf'
  title: string
  citation: string
  run: (grammar: CFG) => Result<Trace>
}

const STAGES: Stage[] = [
  { id: 'epsilon', title: 'Eliminate ε-productions', citation: '§7.1.3, Thm 7.9', run: eliminateEpsilon as Stage['run'] },
  { id: 'unit', title: 'Eliminate unit productions', citation: '§7.1.4, Thm 7.13', run: eliminateUnit as Stage['run'] },
  { id: 'useless', title: 'Eliminate useless symbols', citation: '§7.1.1–7.1.2, Thm 7.2', run: eliminateUseless as Stage['run'] },
  { id: 'cnf', title: 'Chomsky Normal Form', citation: '§7.1.5, Thm 7.16', run: toCNF as Stage['run'] },
]

interface StageRun {
  stage: Stage
  input: CFG
  trace: Trace | null
  errors: ValidationError[]
  output: CFG | null
}

function runPipeline(grammar: CFG): StageRun[] {
  const runs: StageRun[] = []
  let current = grammar
  for (const stage of STAGES) {
    const result = stage.run(current)
    if (!isOk(result)) {
      runs.push({ stage, input: current, trace: null, errors: result.errors, output: null })
      break
    }
    const output = result.value.result.type === 'grammar' ? result.value.result.grammar : current
    runs.push({ stage, input: current, trace: result.value, errors: [], output })
    current = output
  }
  return runs
}

export function SimplifyPipeline(): React.JSX.Element {
  const [grammar, setGrammar] = useState<CFG | null>(null)
  const [active, setActive] = useState(0)
  const [showWrongOrder, setShowWrongOrder] = useState(false)

  const runs = useMemo(() => (grammar === null ? [] : runPipeline(grammar)), [grammar])
  const run = runs[Math.min(active, Math.max(0, runs.length - 1))] ?? null
  const playback = usePlayback(run?.trace ?? null)
  const step = run?.trace?.steps[playback.stepIndex] ?? null
  const snapshot = (step?.snapshot ?? null) as
    | (Record<string, unknown> & { grammar: CFG; generating?: string[]; reachable?: string[]; nullable?: string[]; pairs?: [string, string][] })
    | null

  const litIndices = useMemo(() => {
    const lit = new Set<number>()
    for (const h of step?.highlight ?? []) if (h.type === 'production') lit.add(h.index)
    return lit
  }, [step])

  const final = runs.length === STAGES.length ? (runs[runs.length - 1]?.output ?? null) : null
  const sample = useMemo(() => {
    if (grammar === null || final === null) return null
    const shortest = (g: CFG): string[] =>
      [...generatedStrings(g, 6)].filter((w) => w !== '').sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 8)
    return { before: shortest(grammar), after: shortest(final) }
  }, [grammar, final])

  const wrongOrder = useMemo(
    () => (run?.stage.id === 'useless' && showWrongOrder ? wrongOrderUseless(run.input) : null),
    [run, showWrongOrder],
  )

  return (
    <div className="tnt-stack">
      <GrammarInput presets={PIPELINE_PRESETS} onGrammar={(g) => setGrammar(g)} />

      <ol
        aria-label="Pipeline stages"
        className="tnt-row"
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
      >
        {STAGES.map((stage, i) => {
          const state = runs[i]
          const status = state === undefined ? 'pending' : state.errors.length > 0 ? 'refused' : 'done'
          return (
            <li key={stage.id}>
              <button
                type="button"
                className="tnt-btn"
                aria-pressed={i === active}
                disabled={state === undefined}
                onClick={() => {
                  setActive(i)
                  setShowWrongOrder(false)
                }}
              >
                {i + 1}. {stage.title} {status === 'done' ? '✓' : status === 'refused' ? '✗' : ''}
              </button>
            </li>
          )
        })}
      </ol>

      {run === null ? null : (
        <section aria-label={run.stage.title} className="tnt-stack">
          <h2 style={{ margin: 0 }}>
            Stage {active + 1}: {run.stage.title}{' '}
            <span className="tnt-meta" style={{ fontWeight: 400 }}>
              Hopcroft 2e {run.stage.citation}
            </span>
          </h2>

          <ValidationErrors errors={run.errors} />

          {run.output === null ? null : <GrammarDiff before={run.input} after={run.output} />}

          {snapshot === null ? null : (
            <div className="tnt-panels">
              <div className="tnt-card tnt-card-plain">
                <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-2)' }}>
                  The grammar at this step
                </div>
                <ProductionList grammar={snapshot.grammar} litIndices={litIndices} />
              </div>
              <div className="tnt-card tnt-stack-sm" style={{ background: 'var(--tnt-bg)', alignContent: 'start' }}>
                {snapshot.generating !== undefined ? <SymbolChips label="Generating" symbols={snapshot.generating} /> : null}
                {snapshot.reachable !== undefined ? <SymbolChips label="Reachable" symbols={snapshot.reachable} /> : null}
                {snapshot.nullable !== undefined ? <SymbolChips label="Nullable" symbols={snapshot.nullable} /> : null}
                {snapshot.pairs !== undefined ? (
                  <SymbolChips label="Unit pairs" symbols={snapshot.pairs.map(([a, b]) => `(${a}, ${b})`)} />
                ) : null}
                {snapshot.generating === undefined && snapshot.nullable === undefined && snapshot.pairs === undefined ? (
                  <span className="tnt-sm tnt-muted">
                    {run.stage.id === 'cnf' ? 'New variables appear as the bodies are reshaped.' : 'Nothing to track at this stage.'}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {run.trace === null ? null : (
            <>
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
          )}

          {run.stage.id === 'useless' ? (
            <div className="tnt-card tnt-stack-sm">
              <strong>Why generating comes before reachable</strong>
              <p style={{ margin: 0 }}>
                Theorem 7.2 orders the two passes. Run them the other way and a symbol can survive
                both: removing a non-generating symbol in the second pass can leave a variable nothing
                reaches any more. Example 7.1 is the smallest case.
              </p>
              <div>
                <button
                  type="button"
                  className="tnt-btn"
                  aria-pressed={showWrongOrder}
                  onClick={() => setShowWrongOrder((v) => !v)}
                >
                  {showWrongOrder ? 'Hide the wrong order' : 'Try reachability first'}
                </button>
              </div>
              {wrongOrder === null ? null : (
                <div role="status" className="tnt-stack-sm">
                  <p style={{ margin: 0 }}>
                    {wrongOrder.residual.length === 0
                      ? 'On this grammar the wrong order happens to give the same answer — it is not wrong in general, only unreliable.'
                      : `Reachability first, then generating, leaves ${wrongOrder.residual.join(', ')} behind — still useless, still in the grammar.`}
                  </p>
                  <ol className="tnt-mono tnt-sm" style={{ margin: 0, paddingLeft: 'var(--tnt-space-5)' }}>
                    {wrongOrder.grammar.productions.map((p, i) => (
                      <li key={i} data-residual={p.body.some((s) => wrongOrder.residual.includes(s)) || wrongOrder.residual.includes(p.head) ? 'true' : undefined}>
                        {productionToText(p)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {final === null || grammar === null ? null : (
        <section aria-label="Pipeline result" className="tnt-card tnt-stack-sm" style={{ borderLeft: '3px solid var(--tnt-accepting)' }}>
          <strong>
            {isCNF(final) ? 'In Chomsky Normal Form' : 'Not in Chomsky Normal Form'} — {final.productions.length} productions,{' '}
            {final.variables.length} variables
          </strong>
          {sample === null ? null : (
            <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
              Shortest strings of the original: {sample.before.join(', ') || '—'}. Of the result:{' '}
              {sample.after.join(', ') || '—'}. The languages agree except for ε, which no CNF grammar
              generates (Theorem 7.16) — a sample, the theorem is the proof.
            </p>
          )}
        </section>
      )}

      <section aria-label="The safe order" className="tnt-card tnt-stack-sm">
        <strong>The safe order (Theorem 7.14) — and the two order traps</strong>
        <p style={{ margin: 0 }}>
          The book <em>introduces</em> useless symbols first (§7.1.1) but <em>prescribes</em> running the
          eliminations as ε-productions, then unit productions, then useless symbols. Eliminating
          ε-productions can create unit productions (A → B | ε becomes A → B); eliminating unit
          productions can leave a variable nothing reaches. Done in the safe order, each pass only
          removes, and nothing the earlier passes removed comes back.
        </p>
        <p style={{ margin: 0 }}>
          Inside the useless-symbol pass there is a second order: non-generating symbols first, then
          unreachable ones (Theorem 7.2). Both traps cost exactly the marks they look like they cost.
        </p>
      </section>
    </div>
  )
}
