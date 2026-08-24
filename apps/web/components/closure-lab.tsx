'use client'

/**
 * The closure lab — Hopcroft 2e §4.2.
 *
 * Pick an operation and its operands, and watch the construction built step by
 * step. Reuses the conversion stepper's parts rather than reimplementing them:
 * every closure operation returns a `Trace`, so the transport bar, the narration
 * panel and the two machine panes all work unchanged.
 *
 * The refusals matter as much as the constructions. Complement on an NFA is not
 * an unimplemented case, it is a wrong answer that looks right, and the lab
 * shows the explanation rather than quietly determinising first.
 */

import { useMemo, useState } from 'react'
import { GALLERY, applyClosure, isOk, minimize, nfaToDfa } from '@tape-n-trace/engine'
import type { ClosureOp, FiniteAutomaton, Homomorphism, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { ConversionResult } from './conversion-result'
import { HomomorphismEditor } from './homomorphism-editor'
import { usePlayback } from '../lib/use-playback'

interface Operation {
  op: ClosureOp
  label: string
  /** How many machines it takes. */
  arity: 1 | 2
  needsHomomorphism?: boolean
  citation: string
  note: string
}

const OPERATIONS: Operation[] = [
  { op: 'union', label: 'Union  L₁ ∪ L₂', arity: 2, citation: '§4.2.1', note: 'A pair accepts when either machine does.' },
  { op: 'intersection', label: 'Intersection  L₁ ∩ L₂', arity: 2, citation: '§4.2.1', note: 'A pair accepts when both do.' },
  { op: 'difference', label: 'Difference  L₁ − L₂', arity: 2, citation: '§4.2.1', note: 'A pair accepts when the first does and the second does not.' },
  { op: 'complement', label: 'Complement  ¬L', arity: 1, citation: '§4.2.1', note: 'Complete the DFA, then swap which states accept.' },
  { op: 'reverse', label: 'Reversal  Lᴿ', arity: 1, citation: '§4.2.2', note: 'Turn every transition around; the result is an ε-NFA.' },
  { op: 'homomorphism', label: 'Homomorphism  h(L)', arity: 1, needsHomomorphism: true, citation: '§4.2.3', note: 'Each transition becomes a path spelling the image of its symbol.' },
  { op: 'inverse-homomorphism', label: 'Inverse homomorphism  h⁻¹(L)', arity: 1, needsHomomorphism: true, citation: '§4.2.4', note: 'The states do not change — only where each symbol takes you.' },
]

/**
 * Every preset, not only the deterministic ones.
 *
 * Offering an NFA is deliberate. Complement on a nondeterministic machine is not
 * an unimplemented case, it is a wrong answer that looks right, and a lab that
 * quietly hides the NFAs teaches nothing about why. Pick one and the refusal
 * explains itself — with a button that performs the fix it names.
 */
const PRESETS = GALLERY

/** Determinise and minimise, for the "convert it first" button. */
function determinise(machine: FiniteAutomaton): FiniteAutomaton | null {
  const subset = nfaToDfa(machine)
  if (!isOk(subset) || subset.value.result.type !== 'machine') return null
  const dfa = subset.value.result.machine as FiniteAutomaton

  const minimal = minimize(dfa)
  return isOk(minimal) && minimal.value.result.type === 'machine'
    ? (minimal.value.result.machine as FiniteAutomaton)
    : dfa
}

export function ClosureLab(): React.JSX.Element {
  const [opId, setOpId] = useState<ClosureOp>('intersection')
  const [leftId, setLeftId] = useState(PRESETS[0]?.id ?? '')
  const [rightId, setRightId] = useState(PRESETS[1]?.id ?? PRESETS[0]?.id ?? '')
  const [h, setH] = useState<Homomorphism>({ '0': ['a', 'b'], '1': ['b'] })
  /** Set by "convert it first", replacing the chosen machine with its DFA. */
  const [converted, setConverted] = useState<FiniteAutomaton | null>(null)

  const operation = OPERATIONS.find((o) => o.op === opId) as Operation
  const chosen = PRESETS.find((e) => e.id === leftId)?.machine
  const left = converted ?? chosen

  /**
   * L₂ is offered only from machines over L₁'s alphabet.
   *
   * A Boolean operation is defined over one alphabet, so pairing a machine over
   * {0,1} with one over the decimal digits is not a hard case — it is a question
   * with no meaning. The engine says so, but a picker that offers the pairing
   * at all invites the student to think the tool is broken.
   */
  const rightOptions = useMemo(
    () =>
      left === undefined
        ? []
        : PRESETS.filter(
            // Deterministic, and over the same alphabet. Every binary operation
            // here is a Boolean one, so both sides must be DFAs; the refusal
            // worth showing is the one on L₁, which offers everything.
            (e) => e.machine.kind === 'DFA' && sameAlphabet(e.machine, left),
          ),
    [left],
  )
  const effectiveRightId = rightOptions.some((e) => e.id === rightId)
    ? rightId
    : (rightOptions[0]?.id ?? '')
  const right = rightOptions.find((e) => e.id === effectiveRightId)?.machine

  // For h⁻¹ the images are read by the original machine, so the editor's
  // alphabet is the *input* side and the images must live in the machine's.
  const inverse = opId === 'inverse-homomorphism'
  const editorAlphabet = inverse ? ['a', 'b'] : (left?.alphabet ?? [])

  const outcome = useMemo(() => {
    if (left === undefined) return { trace: null as Trace | null, errors: [] as ValidationError[] }
    const result = applyClosure(
      opId,
      left,
      operation.arity === 2 ? (right ?? null) : null,
      operation.needsHomomorphism === true ? h : null,
    )
    return isOk(result)
      ? { trace: result.value as Trace, errors: [] as ValidationError[] }
      : { trace: null as Trace | null, errors: result.errors }
  }, [opId, left, right, h, operation])

  const needsDeterminising = outcome.errors.some((e) => e.code === 'CLOSURE_NEEDS_DFA')

  const playback = usePlayback(outcome.trace)
  const step = outcome.trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot as
    | { left?: FiniteAutomaton; right?: FiniteAutomaton | null; target?: FiniteAutomaton }
    | undefined

  return (
    <div className="tnt-stack">
      <section className="tnt-card tnt-stack">
        <label className="tnt-row">
          <span className="tnt-sm tnt-muted" style={{ minWidth: 90 }}>
            Operation
          </span>
          <select
            className="tnt-select"
            value={opId}
            onChange={(e) => setOpId(e.target.value as ClosureOp)}
          >
            {OPERATIONS.map((o) => (
              <option key={o.op} value={o.op}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="tnt-meta">Hopcroft 2e, {operation.citation}</span>
        </label>

        <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
          {operation.note}
        </p>

        <label className="tnt-row">
          <span className="tnt-sm tnt-muted" style={{ minWidth: 90 }}>
            {operation.arity === 2 ? 'L₁' : 'Machine'}
          </span>
          <select
            className="tnt-select"
            value={leftId}
            onChange={(e) => {
              setLeftId(e.target.value)
              setConverted(null)
            }}
          >
            {PRESETS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </select>
        </label>

        {operation.arity === 2 ? (
          <label className="tnt-row">
            <span className="tnt-sm tnt-muted" style={{ minWidth: 90 }}>
              L₂
            </span>
            <select
              className="tnt-select"
              value={effectiveRightId}
              onChange={(e) => setRightId(e.target.value)}
            >
              {rightOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {operation.needsHomomorphism === true ? (
          <HomomorphismEditor
            alphabet={editorAlphabet}
            value={h}
            onChange={setH}
            imagesMustBeIn={inverse ? left?.alphabet : undefined}
          />
        ) : null}
      </section>

      <ValidationErrors errors={outcome.errors} />

      {needsDeterminising && chosen !== undefined ? (
        <div>
          <button
            type="button"
            className="tnt-btn tnt-btn-primary"
            onClick={() => setConverted(determinise(chosen))}
          >
            Convert it to a complete DFA first
          </button>
          <p className="tnt-meta" style={{ margin: 'var(--tnt-space-1) 0 0' }}>
            Runs the subset construction and minimises the result. Watch it happen on the{' '}
            <a href="/convert/nfa-to-dfa">conversion page</a> instead if you would rather see the working.
          </p>
        </div>
      ) : null}

      {converted === null ? null : (
        <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
          Using the determinised machine ({converted.states.length} states).{' '}
          <button
            type="button"
            onClick={() => setConverted(null)}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--tnt-current)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Use the original again
          </button>
        </p>
      )}

      {outcome.trace === null ? null : (
        <>
          <div className="tnt-panels tnt-panels-narrow">
            {snapshot?.left === undefined ? null : (
              <Pane title={operation.arity === 2 ? 'L₁' : 'Source'}>
                <AutomatonRenderer machine={snapshot.left} step={step} instanceId="cl-left" />
              </Pane>
            )}
            {snapshot?.right === undefined || snapshot.right === null ? null : (
              <Pane title="L₂">
                <AutomatonRenderer machine={snapshot.right} step={step} instanceId="cl-right" />
              </Pane>
            )}
            {snapshot?.target === undefined ? null : (
              <Pane title="Result">
                <AutomatonRenderer machine={snapshot.target} step={step} instanceId="cl-out" />
              </Pane>
            )}
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

          <ConversionResult
            trace={outcome.trace}
            atEnd={playback.atEnd}
            onJumpToEnd={playback.jumpToEnd}
          />
        </>
      )}
    </div>
  )
}

/** Two machines can be combined only when they read the same symbols. */
function sameAlphabet(a: FiniteAutomaton, b: FiniteAutomaton): boolean {
  const left = [...new Set(a.alphabet)].sort()
  const right = [...new Set(b.alphabet)].sort()
  return left.length === right.length && left.every((s, i) => s === right[i])
}

function Pane({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="tnt-stack-sm">
      <h2 className="tnt-label" style={{ margin: 0 }}>
        {title}
      </h2>
      <div className="tnt-card tnt-scroll-x" style={{ background: 'var(--tnt-bg)', minWidth: 0 }}>
        {children}
      </div>
    </section>
  )
}
