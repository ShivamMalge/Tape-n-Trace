/**
 * The notebook viewer: a trace, a step index, and the web app's own renderers.
 *
 * The step index lives in the Python kernel (the `step` trait), so
 * `run.step = 3` in a cell moves this view; playback pacing lives here,
 * because Python never emits animation instructions (documentation.md §10).
 */

import { useEffect, useRef, useState } from 'react'
import type { FiniteAutomaton, Step, Sym, Trace, TraceResult } from '@tape-n-trace/engine'
import { AutomatonRenderer, InputStrip, TransportBar } from '@tape-n-trace/ui'

import { NodesPanel, TapesPanel } from './panels.js'

export interface ViewerProps {
  payload: Record<string, unknown> | null
  trace: Trace | null
  step: number
  options: Record<string, unknown>
  onStepChange: (step: number) => void
}

const isMachine = (value: unknown): value is FiniteAutomaton =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as FiniteAutomaton).states) &&
  Array.isArray((value as FiniteAutomaton).transitions)

/** The machine this step is about: the snapshot's, else the payload itself. */
function machineOf(step: Step | null, payload: ViewerProps['payload']): FiniteAutomaton | null {
  const snapshot = step?.snapshot as Record<string, unknown> | undefined
  for (const key of ['machine', 'target', 'source']) {
    if (snapshot !== undefined && isMachine(snapshot[key])) return snapshot[key] as FiniteAutomaton
  }
  return isMachine(payload) ? payload : null
}

function resultText(result: TraceResult): string {
  switch (result.type) {
    case 'acceptance':
      return result.accepted ? 'Accepted.' : 'Rejected.'
    case 'incomplete':
      return `Stopped: ${result.reason}`
    default:
      return ''
  }
}

export function Viewer({ payload, trace, step, options, onStepChange }: ViewerProps): React.JSX.Element {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const stepCount = trace?.steps.length ?? 0
  const index = Math.min(Math.max(0, step), Math.max(0, stepCount - 1))
  const current = trace?.steps[index] ?? null
  const machine = machineOf(current, payload)
  const snapshot = current?.snapshot as
    | {
        input?: Sym[]
        position?: number
        nodes?: unknown[]
        current?: { state: string; tapes: { cells: string[]; offset: number; head: number }[] }
        machine?: { blank?: string }
      }
    | undefined
  const tapeMode = options['convention'] === 'head-moves' ? 'tape-fixed' : 'head-fixed'

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!playing || stepCount === 0) return
    if (index >= stepCount - 1) {
      setPlaying(false)
      return
    }
    timer.current = setInterval(() => onStepChange(Math.min(index + 1, stepCount - 1)), 1100 / speed)
    return () => {
      if (timer.current !== null) clearInterval(timer.current)
    }
  }, [playing, speed, index, stepCount, onStepChange])

  if (trace === null && machine === null) {
    return <p className="vyk-empty">Nothing to draw yet: set a payload or a trace.</p>
  }

  return (
    <div className="vyk-stack">
      {machine === null ? null : <AutomatonRenderer machine={machine} step={current} instanceId="vyk" />}
      {snapshot?.input !== undefined && typeof snapshot.position === 'number' ? (
        <InputStrip input={snapshot.input} position={snapshot.position} step={current} />
      ) : null}
      <TapesPanel
        tapes={snapshot?.current?.tapes}
        blank={snapshot?.machine?.blank ?? 'B'}
        mode={tapeMode}
        state={snapshot?.current?.state}
        step={current}
      />
      <NodesPanel nodes={snapshot?.nodes} input={snapshot?.input} step={current} />
      {trace === null ? null : (
        <>
          <TransportBar
            stepIndex={index}
            stepCount={stepCount}
            playing={playing}
            speed={speed}
            onStepChange={onStepChange}
            onPlayingChange={setPlaying}
            onSpeedChange={setSpeed}
            narration={current?.narration}
          />
          <p className="vyk-narration" aria-live="polite">
            {current?.narration ?? ''}
          </p>
          {index === stepCount - 1 ? <p className="vyk-result">{resultText(trace.result)}</p> : null}
        </>
      )}
    </div>
  )
}
