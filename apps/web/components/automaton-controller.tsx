'use client'

/**
 * The controller half of the triad — architecture.md §10.1 — laid out as
 * design artboard 02: the input row with Try chips; a 1fr / 344px grid whose
 * left column is the diagram card, the input strip, the transport and the
 * branch tree, and whose right column is the narration, the verdict and the
 * docs; the multi-run table beneath.
 *
 *   user input → controller → engine fn → Trace
 *                    └─── trace + stepIndex ───→ renderer → SVG
 *
 * This component owns *all* the state: the machine, the current trace, the step
 * index, and playback. It is the only place on this page that calls the engine.
 * The renderers it hands results to compute nothing.
 *
 * The trace is computed once per run and held. Scrubbing changes an index into
 * an array that already exists — never a re-simulation — which is what makes
 * seeking to any step cost a render rather than a run.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isOk, simulate } from '@tape-n-trace/engine'
import type { FiniteAutomaton, Highlight, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, InputStrip, TransportBar } from '@tape-n-trace/ui'
import { NarrationPanel } from './narration-panel'
import { VerdictBanner } from './verdict-banner'
import { ValidationErrors } from './validation-errors'
import { MultiRunTable } from './multi-run-table'
import { snapshotOf, type AnySnapshot } from '../lib/snapshot'

export interface AutomatonControllerProps {
  machine: FiniteAutomaton
  suggested?: string[]
  initialInput?: string
  /** Cards for the right column, under the verdict — the machine's docs. */
  aside?: ReactNode
}

export function AutomatonController({
  machine,
  suggested = [],
  initialInput = '',
  aside,
}: AutomatonControllerProps): React.JSX.Element {
  /**
   * The page arrives with a run already loaded, paused at step 0.
   *
   * Computed during the first render rather than in a mount effect, so the
   * prerendered HTML and the hydrated client agree. Safe to do in render because
   * `simulate` is pure and deterministic (§2.5) — same machine, same string,
   * byte-identical trace on both sides.
   */
  const initial = useMemo(() => {
    const result = simulate(machine, initialInput)
    return isOk(result)
      ? { trace: result.value as Trace, errors: [] as ValidationError[] }
      : { trace: null, errors: result.errors }
  }, [machine, initialInput])

  const [input, setInput] = useState(initialInput)
  const [ran, setRan] = useState<string | null>(initialInput)
  const [trace, setTrace] = useState<Trace | null>(initial.trace)
  const [errors, setErrors] = useState<ValidationError[]>(initial.errors)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const run = useCallback(
    (word: string, autoplay = true) => {
      const result = simulate(machine, word)
      setRan(word)
      if (isOk(result)) {
        setTrace(result.value as Trace)
        setErrors([])
        setStepIndex(0)
        setPlaying(autoplay)
      } else {
        setTrace(null)
        setErrors(result.errors)
        setPlaying(false)
      }
    },
    [machine],
  )

  // Playback. The engine emits no timing (§10.1) — pacing lives here, and here
  // only, so every feature scrubs at the same speeds.
  const stepCount = trace?.steps.length ?? 0
  const atEnd = stepIndex >= stepCount - 1
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing || stepCount === 0) return
    if (atEnd) {
      setPlaying(false)
      return
    }
    timer.current = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, stepCount - 1))
    }, 900 / speed)
    return () => {
      if (timer.current !== null) clearInterval(timer.current)
    }
  }, [playing, speed, stepCount, atEnd])

  const step = trace?.steps[stepIndex] ?? null
  const snapshot = useMemo<AnySnapshot | null>(() => snapshotOf(step), [step])

  // Drawn from the snapshot when a run is loaded, so the diagram always matches
  // the step being described, and from the machine itself when it is not.
  const drawn = snapshot?.machine ?? machine

  // The state(s) the run is in, for the narration card's corner.
  const where = useMemo(() => {
    const current =
      step?.highlight
        .filter((h): h is Extract<Highlight, { type: 'state' }> => h.type === 'state' && h.role === 'current')
        .map((h) => h.id) ?? []
    return current.length === 0 ? undefined : current.join(', ')
  }, [step])

  return (
    <div className="tnt-stack-lg">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        className="tnt-input-row"
      >
        <label className="tnt-input-label" htmlFor="fa-input">
          Input
        </label>
        <input
          id="fa-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="try 0110"
          spellCheck={false}
          autoComplete="off"
          aria-description={`over {${machine.alphabet.join(', ')}}`}
          className="tnt-input tnt-input-mono tnt-input-lg"
        />
        <button type="submit" className="tnt-btn tnt-btn-primary">
          Run
        </button>
        {suggested.length > 0 ? (
          <>
            <span className="tnt-divider" aria-hidden="true" />
            <div className="tnt-try" role="group" aria-label="Try">
              <span className="tnt-input-label">Try</span>
              {suggested.map((word) => (
                <button
                  key={word || 'empty'}
                  type="button"
                  className="tnt-chip"
                  aria-pressed={ran === word}
                  onClick={() => {
                    setInput(word)
                    run(word)
                  }}
                >
                  {word === '' ? 'ε (empty)' : word}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </form>

      <ValidationErrors errors={errors} />

      <div className="tnt-panels-aside">
        <div className="tnt-stack-lg">
          <div className="tnt-diagram-card">
            <AutomatonRenderer machine={drawn} step={step} instanceId="sim" />
          </div>

          {snapshot === null ? null : (
            <section className="tnt-card" aria-label="Input">
              <div className="tnt-card-head">
                <h2 className="tnt-label">Input</h2>
                <span className="tnt-meta">
                  {snapshot.position} of {snapshot.input.length} read
                </span>
              </div>
              <InputStrip input={snapshot.input} position={snapshot.position} step={step} />
            </section>
          )}

          <TransportBar
            stepIndex={stepIndex}
            stepCount={stepCount}
            playing={playing}
            speed={speed}
            onStepChange={setStepIndex}
            onPlayingChange={setPlaying}
            onSpeedChange={setSpeed}
            narration={step?.narration}
          />

          {snapshot?.nodes === undefined ? null : (
            <section className="tnt-card" aria-label="Branch tree">
              <div className="tnt-card-head">
                <h2 className="tnt-label">Branch tree</h2>
                <span className="tnt-meta">every guess at once</span>
              </div>
              <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: '0 0 var(--tnt-space-3)' }}>
                Every branch the machine is exploring at once. A branch with no move left dies where it stands, and
                stays on the diagram so you can see where the guess went wrong.
              </p>
              <div className="tnt-scroll-x">
                <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
              </div>
            </section>
          )}
        </div>

        <div className="tnt-stack">
          <NarrationPanel step={step} label={where} />
          {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}
          {aside}
        </div>
      </div>

      <MultiRunTable
        machine={machine}
        onLoad={(word) => {
          setInput(word)
          run(word)
        }}
      />
    </div>
  )
}
