'use client'

/**
 * The conversion stepper shell — phases.md P0.3.
 *
 * "Source left, growing target right, artifact table underneath." One shell for
 * every conversion, which is the second thing the trace protocol buys: subset
 * construction, ε-elimination, minimisation, state elimination and Thompson all
 * return a `Trace`, so all five are driven by this component and scrubbed by the
 * same transport bar.
 *
 * Same triad as `/simulate`: this owns the machine, the trace, the step index
 * and playback, and the renderers it hands results to compute nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isOk } from '@tape-n-trace/engine'
import type { Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { ArtifactPanel } from './artifact-panel'
import { NarrationPanel } from './narration-panel'
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
}

export function ConversionStepper({
  conversion,
  input,
  picker,
  disabled = false,
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

  const jumpToEnd = useCallback(() => setStepIndex(Math.max(0, stepCount - 1)), [stepCount])

  return (
    <div className="tnt-stack">
      {picker}

      {disabled ? null : <ValidationErrors errors={initial.errors} />}

      {disabled || trace === null ? null : (
        <>
          {/* One pane or two: a conversion with no source to show gets the whole
              width rather than a column beside an empty one. */}
          <div
            className={source === null ? 'tnt-stack' : 'tnt-panels'}
            style={{ alignItems: 'start' }}
          >
            {source === null ? null : (
              <Pane title="Source" subtitle={describe(source.kind)}>
                <AutomatonRenderer machine={source} step={step} instanceId="conv-src" />
              </Pane>
            )}

            {target === null ? (
              <Pane title="Result" subtitle="built as the steps run">
                <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
                  Nothing built yet — step forward to watch it appear.
                </p>
              </Pane>
            ) : (
              <Pane title="Result" subtitle={describe(target.kind)}>
                <AutomatonRenderer machine={target} step={step} instanceId="conv-tgt" />
              </Pane>
            )}
          </div>

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

          {artifact === null ? null : <ArtifactPanel artifact={artifact} step={step} />}

          <ConversionResult trace={trace} atEnd={atEnd} onJumpToEnd={jumpToEnd} />
        </>
      )}
    </div>
  )
}

function Pane({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="tnt-stack-sm">
      <h2 className="tnt-label" style={{ margin: 0 }}>
        {title}{' '}
        {/* `.tnt-label` is uppercase, tracked and semibold, and all three are
            inherited; the subtitle is running text, so it undoes them. */}
        <span className="tnt-muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
          — {subtitle}
        </span>
      </h2>
      <div className="tnt-card tnt-scroll-x" style={{ background: 'var(--tnt-bg)', minWidth: 0 }}>
        {children}
      </div>
    </section>
  )
}

function describe(kind: 'DFA' | 'NFA' | 'ENFA'): string {
  return kind === 'ENFA' ? 'ε-NFA' : kind
}
