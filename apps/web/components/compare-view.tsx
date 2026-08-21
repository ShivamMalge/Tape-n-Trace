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
    <section style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 15, margin: 0 }}>Watch them disagree on {shown}</h2>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {[
          { machine: left, trace: runs.left, label: leftLabel, id: 'cmp-l' },
          { machine: right, trace: runs.right, label: rightLabel, id: 'cmp-r' },
        ].map(({ machine, trace, label, id }) => (
          <div key={id} style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <h3 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {label}
              <VerdictTag trace={trace} />
            </h3>
            <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
              <AutomatonRenderer machine={machine} step={stepOf(trace)} instanceId={id} />
            </div>
            <p className="tnt-muted" style={{ margin: 0, fontSize: 12, minHeight: 30 }}>
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
      style={{
        marginLeft: 8,
        fontSize: 11,
        padding: '1px 8px',
        borderRadius: 999,
        textTransform: 'none',
        letterSpacing: 0,
        border: `1px solid ${accepted ? 'var(--tnt-accepting)' : 'var(--tnt-marked)'}`,
        color: accepted ? 'var(--tnt-accepting)' : 'var(--tnt-marked)',
        background: accepted ? 'var(--tnt-accepting-soft)' : 'var(--tnt-surface)',
      }}
    >
      {accepted ? 'accepts' : 'rejects'}
    </span>
  )
}
