'use client'

/**
 * The controller half of the triad — architecture.md §10.1.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isOk, simulate } from '@tape-n-trace/engine'
import type { FiniteAutomaton, Trace, ValidationError } from '@tape-n-trace/engine'
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
}

export function AutomatonController({
  machine,
  suggested = [],
  initialInput = '',
}: AutomatonControllerProps): React.JSX.Element {
  /**
   * The page arrives with a run already loaded, paused at step 0.
   *
   * Computed during the first render rather than in a mount effect, so the
   * prerendered HTML and the hydrated client agree. An effect would ship static
   * HTML showing "step 1 of 0" and then correct itself, which reads as a broken
   * page for exactly as long as it takes to notice. Safe to do in render because
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
  const [trace, setTrace] = useState<Trace | null>(initial.trace)
  const [errors, setErrors] = useState<ValidationError[]>(initial.errors)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const run = useCallback(
    (word: string, autoplay = true) => {
      const result = simulate(machine, word)
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4, flex: '1 1 240px' }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Input string (over {`{${machine.alphabet.join(', ')}}`})
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="try 0110"
            spellCheck={false}
            autoComplete="off"
            style={{
              fontFamily: 'var(--tnt-mono)',
              fontSize: 15,
              padding: '7px 9px',
              borderRadius: 'var(--tnt-radius)',
              border: '1px solid var(--tnt-border)',
              background: 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              width: '100%',
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-current)',
            background: 'var(--tnt-current)',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Run
        </button>
      </form>

      {suggested.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            Try:
          </span>
          {suggested.map((word) => (
            <button
              key={word || 'empty'}
              type="button"
              onClick={() => {
                setInput(word)
                run(word)
              }}
              style={{
                fontFamily: 'var(--tnt-mono)',
                fontSize: 13,
                padding: '3px 9px',
                borderRadius: 999,
                border: '1px solid var(--tnt-border)',
                background: 'var(--tnt-bg)',
                color: 'var(--tnt-text)',
                cursor: 'pointer',
              }}
            >
              {word === '' ? 'ε (empty)' : word}
            </button>
          ))}
        </div>
      ) : null}

      <ValidationErrors errors={errors} />
      {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}

      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        <AutomatonRenderer machine={drawn} step={step} instanceId="sim" />
      </div>

      {snapshot === null ? null : (
        <InputStrip input={snapshot.input} position={snapshot.position} step={step} />
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

      <NarrationPanel step={step} />

      {snapshot?.nodes === undefined ? null : (
        <section>
          <h2 style={{ fontSize: 15 }}>Branch tree</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            Every branch the machine is exploring at once. A branch with no move left dies where it
            stands, and stays on the diagram so you can see where the guess went wrong.
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
            <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
          </div>
        </section>
      )}

      <MultiRunTable machine={machine} onLoad={(word) => { setInput(word); run(word) }} />
    </div>
  )
}
