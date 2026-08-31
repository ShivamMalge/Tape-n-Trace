'use client'

/**
 * The conversion stepper shell — phases.md P0.3, laid out as design artboard
 * 03: the source card (fixed) beside the result card (blue-bordered, "n of m
 * states"), the artifact table beneath, then the narration in Spectral beside
 * a compact transport on a left rule, and the result banner at the last step.
 *
 * One shell for every conversion, which is the second thing the trace
 * protocol buys: subset construction, ε-elimination, minimisation, state
 * elimination and Thompson all return a `Trace`, so all five are driven by this
 * component and scrubbed by the same transport bar.
 *
 * Same triad as `/simulate`: this owns the machine, the trace, the step index
 * and playback, and the renderers it hands results to compute nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isOk } from '@tape-n-trace/engine'
import type { FiniteAutomaton, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { ArtifactPanel } from './artifact-panel'
import { ValidationErrors } from './validation-errors'
import { ConversionResult } from './conversion-result'
import { artifactOf, panesOf } from '../lib/artifact'
import type { Conversion, ConversionInput } from '../lib/conversions'

export interface ConversionStepperProps {
  conversion: Conversion
  input: ConversionInput
  /** Rendered above the diagrams — the source picker for this conversion. */
  picker?: React.ReactNode
  /**
   * Hold everything below the picker back — the source is not yet runnable.
   *
   * A flag rather than the caller returning the picker on its own, because that
   * changes the shape of the tree: React unmounts and remounts the picker, and
   * the field the student is typing into loses focus on the first bad keystroke.
   */
  disabled?: boolean
  /** Docs cards for the foot of the page. */
  docs?: ReactNode
}

export function ConversionStepper({
  conversion,
  input,
  picker,
  disabled = false,
  docs,
}: ConversionStepperProps): React.JSX.Element {
  // Computed during render, not in an effect, so the prerendered HTML and the
  // hydrated client agree. Safe because the engine is pure and deterministic.
  const initial = useMemo(() => {
    const result = conversion.run(input)
    return isOk(result)
      ? { trace: result.value, errors: [] as ValidationError[] }
      : { trace: null, errors: result.errors }
  }, [conversion, input])

  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // A new source means a new trace, and the scrubber must go back to the start.
  useEffect(() => {
    setStepIndex(0)
    setPlaying(false)
  }, [initial])

  const trace: Trace | null = initial.trace
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
    }, 1100 / speed)
    return () => {
      if (timer.current !== null) clearInterval(timer.current)
    }
  }, [playing, speed, stepCount, atEnd])

  const step = trace?.steps[stepIndex] ?? null
  const panes = useMemo(() => (trace === null ? null : panesOf(trace, step)), [trace, step])
  const source = panes?.source ?? null
  const target = panes?.target ?? null
  const artifact = useMemo(() => (trace === null ? null : artifactOf(trace, step)), [trace, step])

  // The finished machine, to say "3 of 3 states" as the result grows.
  const finalStates =
    trace?.result.type === 'machine' ? (trace.result.machine as FiniteAutomaton).states.length : null

  const jumpToEnd = useCallback(() => setStepIndex(Math.max(0, stepCount - 1)), [stepCount])

  return (
    <div className="tnt-stack-lg">
      {picker}

      {disabled ? null : <ValidationErrors errors={initial.errors} />}

      {disabled || trace === null ? null : (
        <>
          {/* One pane or two: a conversion with no source to show gets the whole
              width rather than a column beside an empty one. */}
          <div className={source === null ? 'tnt-stack' : 'tnt-conv-panes'}>
            {source === null ? null : (
              <Pane title={`Source · ${describe(source.kind)}`} meta="fixed">
                <AutomatonRenderer machine={source} step={step} instanceId="conv-src" />
              </Pane>
            )}

            {target === null ? (
              <Pane title="Result" meta="built as the steps run" target>
                <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: 0 }}>
                  Nothing built yet — step forward to watch it appear.
                </p>
              </Pane>
            ) : (
              <Pane
                title={`Result · ${describe(target.kind)}`}
                meta={finalStates === null ? `${target.states.length} states` : `${target.states.length} of ${finalStates} states`}
                target
              >
                <AutomatonRenderer machine={target} step={step} instanceId="conv-tgt" />
              </Pane>
            )}
          </div>

          {artifact === null ? null : <ArtifactPanel artifact={artifact} step={step} />}

          <div className="tnt-conv-row" aria-live="polite" aria-atomic="true">
            <p className="tnt-conv-narration">{step?.narration ?? ''}</p>
            <div className="tnt-conv-transport">
              <TransportBar
                compact
                stepIndex={stepIndex}
                stepCount={stepCount}
                playing={playing}
                speed={speed}
                onStepChange={setStepIndex}
                onPlayingChange={setPlaying}
                onSpeedChange={setSpeed}
                narration={step?.narration}
              />
            </div>
          </div>

          <ConversionResult trace={trace} atEnd={atEnd} onJumpToEnd={jumpToEnd} />
        </>
      )}

      {docs === undefined ? null : <div className="tnt-conv-panes">{docs}</div>}
    </div>
  )
}

function Pane({
  title,
  meta,
  target = false,
  children,
}: {
  title: string
  meta: string
  target?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={`tnt-card tnt-pane${target ? ' tnt-pane-target' : ''}`}>
      <div className="tnt-card-head">
        <h2 className="tnt-label">{title}</h2>
        <span className="tnt-meta">{meta}</span>
      </div>
      <div className="tnt-scroll-x">{children}</div>
    </section>
  )
}

function describe(kind: 'DFA' | 'NFA' | 'ENFA'): string {
  return kind === 'ENFA' ? 'ε-NFA' : kind
}
