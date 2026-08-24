'use client'

/**
 * The CFL closure lab — Hopcroft 2e §7.3.
 *
 * Grammar operations (union, concatenation, closure, reversal, homomorphism,
 * substitution) build a grammar step by step; the two PDA operations
 * (intersection with a regular language, inverse homomorphism) build a machine
 * that can then be run. And the operation the CFLs are *not* closed under has
 * a card of its own: Example 7.26's two grammars whose intersection is
 * aⁿbⁿcⁿ, handed to the pumping game that proves it is not context-free.
 */

import { useMemo, useState } from 'react'
import {
  acceptsPDA,
  cflConcat,
  cflHomomorphism,
  cflIntersectRegular,
  cflInverseHomomorphism,
  cflReversal,
  cflStar,
  cflSubstitution,
  cflUnion,
  isOk,
  pdaPreset,
} from '@tape-n-trace/engine'
import type { CFG, PDA, Result, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { ProductionList } from './grammar-input'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { PdaRunner } from './pda-runner'
import { usePlayback } from '../lib/use-playback'
import { pdaToDrawable } from '../lib/pda-drawable'
import { NonClosureCard, UndecidableCard } from './cfl-docs-cards'
import { AgreementTable, ResultSample } from './cfl-result-panels'
import {
  CFL_PRESETS,
  DFA_PRESETS,
  OPS,
  SUBSTITUTION_DEMO,
  finalStatePda,
  runDfa,
  verdict,
  type CflPreset,
  type Op,
} from '../lib/cfl-lab'

export function CflClosureLab(): React.JSX.Element {
  const [op, setOp] = useState<Op>('union')
  const [leftId, setLeftId] = useState('anbn')
  const [rightId, setRightId] = useState('bplus')
  const [dfaId, setDfaId] = useState('even-as')
  const [hText, setHText] = useState<Record<string, string>>({ a: '01', b: '' })
  const [invText, setInvText] = useState<Record<string, string>>({ x: 'ab', y: 'aabb' })

  const operation = OPS.find((o) => o.id === op) as (typeof OPS)[number]
  const left = (CFL_PRESETS.find((p) => p.id === leftId) ?? CFL_PRESETS[0]) as CflPreset
  const right = (CFL_PRESETS.find((p) => p.id === rightId) ?? CFL_PRESETS[1]) as CflPreset
  const dfa = (DFA_PRESETS.find((d) => d.id === dfaId) ?? DFA_PRESETS[0]) as (typeof DFA_PRESETS)[number]

  const outcome = useMemo<{ trace: Trace | null; errors: ValidationError[] }>(() => {
    let result: Result<Trace>
    switch (op) {
      case 'union':
        result = cflUnion(left.grammar, right.grammar) as Result<Trace>
        break
      case 'concat':
        result = cflConcat(left.grammar, right.grammar) as Result<Trace>
        break
      case 'star':
        result = cflStar(left.grammar) as Result<Trace>
        break
      case 'reverse':
        result = cflReversal(left.grammar) as Result<Trace>
        break
      case 'homomorphism':
        result = cflHomomorphism(
          left.grammar,
          Object.fromEntries(left.grammar.terminals.map((t) => [t, [...(hText[t] ?? '')]])),
        ) as Result<Trace>
        break
      case 'substitution':
        result = cflSubstitution(SUBSTITUTION_DEMO.base, SUBSTITUTION_DEMO.images) as Result<Trace>
        break
      case 'intersection': {
        const pda = finalStatePda(left.grammar)
        result =
          pda === null
            ? { ok: false, errors: [{ code: 'NO_PDA', message: 'The grammar could not be turned into a PDA.', subject: { kind: 'machine' } }] }
            : (cflIntersectRegular(pda, dfa.machine) as Result<Trace>)
        break
      }
      case 'inverse-homomorphism': {
        const pda = (pdaPreset('anbn') as NonNullable<ReturnType<typeof pdaPreset>>).machine
        result = cflInverseHomomorphism(
          pda,
          Object.fromEntries(Object.entries(invText).map(([k, v]) => [k, [...v]])),
        ) as Result<Trace>
        break
      }
    }
    return isOk(result) ? { trace: result.value, errors: [] } : { trace: null, errors: result.errors }
  }, [op, left, right, dfa, hText, invText])

  const trace = outcome.trace
  const playback = usePlayback(trace)
  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = (step?.snapshot ?? null) as (Record<string, unknown> & { grammar?: CFG; target?: PDA; source?: PDA }) | null

  const litIndices = useMemo(() => {
    const lit = new Set<number>()
    for (const h of step?.highlight ?? []) if (h.type === 'production') lit.add(h.index)
    return lit
  }, [step])

  const resultGrammar = trace !== null && trace.result.type === 'grammar' ? trace.result.grammar : null
  const resultPda = trace !== null && trace.result.type === 'machine' ? (trace.result.machine as PDA) : null

  const sourcePda = useMemo(() => {
    if (op === 'intersection') return finalStatePda(left.grammar)
    if (op === 'inverse-homomorphism') return (pdaPreset('anbn') as NonNullable<ReturnType<typeof pdaPreset>>).machine
    return null
  }, [op, left])

  // A few strings, both sides, so the closure is seen on strings rather than read as a slogan.
  const agreement = useMemo(() => {
    if (resultPda === null || sourcePda === null) return null
    if (op === 'intersection') {
      const words = ['', 'ab', 'aabb', 'abab', 'aaabbb', 'b', 'aab']
      return words.map((w) => ({
        w,
        left: `${verdict(acceptsPDA(sourcePda, w))} · DFA ${dfa.machine.accepting.includes(runDfa(dfa.machine, w) ?? '') ? 'accepts' : 'rejects'}`,
        right: verdict(acceptsPDA(resultPda, w)),
      }))
    }
    const words = ['', 'x', 'y', 'xx', 'xy', 'yx', 'xxy']
    return words.map((w) => {
      const image = [...w].flatMap((s) => [...(invText[s] ?? '')])
      return { w, left: `h(w) = ${image.join('') || 'ε'}: ${verdict(acceptsPDA(sourcePda, image))}`, right: verdict(acceptsPDA(resultPda, w)) }
    })
  }, [op, resultPda, sourcePda, dfa, invText])

  return (
    <div className="tnt-stack">
      <div className="tnt-row tnt-row-tight" role="group" aria-label="Operation">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            className="tnt-btn"
            aria-pressed={o.id === op}
            onClick={() => setOp(o.id)}
          >
            {o.title}
          </button>
        ))}
      </div>

      <p className="tnt-meta" style={{ margin: 0 }}>
        Hopcroft 2e {operation.citation}.
      </p>

      {op === 'substitution' ? (
        <div className="tnt-card">
          Example 7.22: L = {'{01}'}, s(0) = {'{aⁿbⁿ | n ≥ 1}'}, s(1) = {'{aa, bb}'}. The result generates
          s(L): every aⁿbⁿ followed by aa or bb.
        </div>
      ) : op === 'inverse-homomorphism' ? (
        <div className="tnt-card tnt-stack-sm">
          <span>P is the gallery’s aⁿbⁿ PDA (by final state). Choose h on {'{x, y}'}:</span>
          <div className="tnt-row">
            {(['x', 'y'] as const).map((s) => (
              <label key={s} className="tnt-field-row">
                h({s}) =
                <input
                  value={invText[s] ?? ''}
                  onChange={(event) => setInvText((prev) => ({ ...prev, [s]: event.target.value }))}
                  aria-label={`h(${s})`}
                  className="tnt-input tnt-input-mono"
                  style={{ width: 90 }}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="tnt-stack">
          <OperandPicker label={operation.arity === 2 ? 'L₁' : 'L'} value={left.id} onChange={setLeftId} />
          {operation.arity === 2 ? <OperandPicker label="L₂" value={right.id} onChange={setRightId} /> : null}
          {op === 'intersection' ? (
            <div className="tnt-row tnt-row-tight">
              <span className="tnt-sm tnt-muted">
                R (a DFA over {'{a, b}'}):
              </span>
              {DFA_PRESETS.map((d) => (
                <button key={d.id} type="button" className="tnt-chip" aria-pressed={d.id === dfa.id} onClick={() => setDfaId(d.id)}>
                  {d.title}
                </button>
              ))}
            </div>
          ) : null}
          {op === 'homomorphism' ? (
            <div className="tnt-row">
              {left.grammar.terminals.map((t) => (
                <label key={t} className="tnt-field-row">
                  h({t}) =
                  <input
                    value={hText[t] ?? ''}
                    onChange={(event) => setHText((prev) => ({ ...prev, [t]: event.target.value }))}
                    aria-label={`h(${t})`}
                    className="tnt-input tnt-input-mono"
                    style={{ width: 90 }}
                    spellCheck={false}
                  />
                </label>
              ))}
              <span className="tnt-meta">
                (empty = ε)
              </span>
            </div>
          ) : null}
        </div>
      )}

      <ValidationErrors errors={outcome.errors} />

      {snapshot?.grammar !== undefined ? (
        <div className="tnt-card tnt-card-plain">
          <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-2)' }}>
            The grammar being built — start symbol {snapshot.grammar.start}
          </div>
          <ProductionList grammar={snapshot.grammar} litIndices={litIndices} />
        </div>
      ) : null}

      {snapshot?.target !== undefined ? (
        <div className="tnt-panels">
          {snapshot.source !== undefined ? (
            <section>
              <h2>P</h2>
              <div className="tnt-card tnt-card-plain">
                <AutomatonRenderer machine={pdaToDrawable(snapshot.source)} step={step} instanceId="cfl-src" />
              </div>
            </section>
          ) : null}
          <section>
            <h2>P′</h2>
            <div className="tnt-card tnt-card-plain">
              <AutomatonRenderer machine={pdaToDrawable(snapshot.target)} step={step} instanceId="cfl-tgt" />
            </div>
          </section>
        </div>
      ) : null}

      {trace === null ? null : (
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

      {resultGrammar === null ? null : <ResultSample grammar={resultGrammar} />}

      {resultPda === null ? null : (
        <>
          {agreement === null ? null : <AgreementTable rows={agreement} op={op} />}
          <section aria-label="Run the result">
            <h2>Run P′</h2>
            <PdaRunner key={resultPda.states.join('|')} machine={resultPda} />
          </section>
        </>
      )}

      <NonClosureCard />
      <UndecidableCard />
    </div>
  )
}

function OperandPicker({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }): React.JSX.Element {
  return (
    <div className="tnt-row tnt-row-tight">
      <span className="tnt-sm tnt-muted">
        {label}:
      </span>
      {CFL_PRESETS.map((p) => (
        <button key={p.id} type="button" className="tnt-chip" aria-pressed={p.id === value} onClick={() => onChange(p.id)}>
          {p.title}
        </button>
      ))}
    </div>
  )
}
