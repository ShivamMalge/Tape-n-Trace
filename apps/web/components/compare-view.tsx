'use client'

/**
 * The compare view — phases.md P1.1.
 *
 * Two machines side by side, the witness loaded into both, and one transport
 * driving both traces in lockstep. The disagreement is the destination: the two
 * runs read the same string, step for step, and end with opposite verdicts —
 * which is what "these machines are not equivalent" *means*, made watchable.
 */

import { useMemo } from 'react'
import { isOk, simulate } from '@tape-n-trace/engine'
import type { FiniteAutomaton, Trace } from '@tape-n-trace/engine'
import { AutomatonRenderer, TransportBar } from '@tape-n-trace/ui'
import { usePlayback } from '../lib/use-playback'

export interface CompareViewProps {
  left: FiniteAutomaton
  right: FiniteAutomaton
  leftLabel: string
  rightLabel: string
  /** The string the two disagree on. */
  witness: string
}

export function CompareView({
  left,
  right,
  leftLabel,
  rightLabel,
  witness,
}: CompareViewProps): React.JSX.Element {
  const runs = useMemo(() => {
    const a = simulate(left, witness)
    const b = simulate(right, witness)
    return {
      left: isOk(a) ? (a.value as Trace) : null,
      right: isOk(b) ? (b.value as Trace) : null,
    }
  }, [left, right, witness])

  // One transport, the longer trace setting the length; the shorter machine
  // holds its final step once its run has ended (a dead DFA run is shorter).
  const longer =
    (runs.left?.steps.length ?? 0) >= (runs.right?.steps.length ?? 0) ? runs.left : runs.right
  const playback = usePlayback(longer)

  const stepOf = (trace: Trace | null) =>
    trace?.steps[Math.min(playback.stepIndex, trace.steps.length - 1)] ?? null

  const shown = witness === '' ? 'the empty string' : `"${witness}"`

  return (
    <section className="tnt-stack">
      <h2 style={{ margin: 0 }}>Watch them disagree on {shown}</h2>

      <div className="tnt-panels">
        {[
          { machine: left, trace: runs.left, label: leftLabel, id: 'cmp-l' },
          { machine: right, trace: runs.right, label: rightLabel, id: 'cmp-r' },
        ].map(({ machine, trace, label, id }) => (
          <div key={id} className="tnt-stack-sm">
            <h3 className="tnt-label" style={{ margin: 0 }}>
              {label}
              <VerdictTag trace={trace} />
            </h3>
            <div className="tnt-card tnt-scroll-x tnt-card-plain">
              <AutomatonRenderer machine={machine} step={stepOf(trace)} instanceId={id} />
            </div>
            {/* The height is held so the panels do not jump as the narration
                changes length from step to step. */}
            <p className="tnt-meta" style={{ margin: 0, minHeight: 30 }}>
              {stepOf(trace)?.narration ?? ''}
            </p>
          </div>
        ))}
      </div>

      <TransportBar
        stepIndex={playback.stepIndex}
        stepCount={playback.stepCount}
        playing={playback.playing}
        speed={playback.speed}
        onStepChange={playback.setStepIndex}
        onPlayingChange={playback.setPlaying}
        onSpeedChange={playback.setSpeed}
        narration={stepOf(longer)?.narration}
      />
    </section>
  )
}

function VerdictTag({ trace }: { trace: Trace | null }): React.JSX.Element | null {
  if (trace === null || trace.result.type !== 'acceptance') return null
  const accepted = trace.result.accepted
  return (
    <span
      className="tnt-tag"
      style={{
        marginLeft: 'var(--tnt-space-2)',
        // The tag sits inside a `.tnt-label` heading, which is uppercase and
        // tracked; both are inherited, and the verdict is neither.
        textTransform: 'none',
        letterSpacing: 0,
        borderColor: accepted ? 'var(--tnt-accepting)' : 'var(--tnt-marked)',
        color: accepted ? 'var(--tnt-accepting)' : 'var(--tnt-marked)',
        background: accepted ? 'var(--tnt-accepting-soft)' : 'var(--tnt-surface)',
      }}
    >
      {accepted ? 'accepts' : 'rejects'}
    </span>
  )
}
