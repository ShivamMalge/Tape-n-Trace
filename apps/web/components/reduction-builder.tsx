'use client'

/**
 * The reduction builder — Hopcroft 2e §8.1.3, phases.md P1.7.
 *
 * Fig. 8.7 has three parts: an instance of P₁, a box that constructs an instance
 * of P₂, and a diamond that decides it. Pick the two problems and the engine
 * builds the box, or refuses and says why.
 *
 * The refusals carry the teaching. Reducing from a decidable problem produces a
 * true statement that proves nothing, which is the mistake the box on p. 316
 * exists to prevent; and the engine will not invent a construction for a pair
 * the prescribed sections do not carry. Both come back as prose, not as an
 * empty diagram.
 */

import { useMemo, useState } from 'react'
import { PROBLEMS, isErr, isKnownHard, problemById, reduce, type Problem } from '@tape-n-trace/engine'
import { TransportBar } from '@tape-n-trace/ui'
import { usePlayback } from '../lib/use-playback'
import { NarrationPanel } from './narration-panel'

const STATUS_LABEL: Record<Problem['status'], string> = {
  decidable: 'decidable',
  undecidable: 'undecidable',
  're-not-recursive': 'RE, but not recursive',
  'not-re': 'not even RE',
}

const STATUS_COLOUR: Record<Problem['status'], string> = {
  decidable: 'var(--tnt-accepting)',
  undecidable: 'var(--tnt-marked)',
  're-not-recursive': 'var(--tnt-marked)',
  'not-re': 'var(--tnt-new)',
}

export function ReductionBuilder(): React.JSX.Element {
  const [fromId, setFromId] = useState('hello-world')
  const [toId, setToId] = useState('calls-foo')

  const built = useMemo(() => reduce(fromId, toId), [fromId, toId])
  const trace = built.ok ? built.value : null
  const playback = usePlayback(trace)
  const step = trace === null ? null : (trace.steps[playback.stepIndex] ?? null)

  const from = problemById(fromId)
  const to = problemById(toId)

  return (
    <div className="tnt-stack">
      <div className="tnt-panels">
        <ProblemPicker
          legend="Start from a problem already known to be undecidable"
          hint="P₁ in Fig. 8.7 — the hard problem whose hardness is being carried across."
          value={fromId}
          onChange={setFromId}
          markDecidable
        />
        <ProblemPicker
          legend="Show that this one is undecidable too"
          hint="P₂ in Fig. 8.7 — the new problem, about which nothing is assumed."
          value={toId}
          onChange={setToId}
        />
      </div>

      {from === undefined || to === undefined ? null : (
        <p style={{ margin: 0 }}>
          Building <strong>{from.name}</strong> ≤ <strong>{to.name}</strong>: if there were an algorithm for{' '}
          {to.name.toLowerCase()}, there would be one for {from.name.toLowerCase()}.
        </p>
      )}

      {isErr(built) ? (
        <div role="alert" className="tnt-card tnt-stack-sm" style={{ borderLeft: '4px solid var(--tnt-marked)' }}>
          <strong>This reduction would prove nothing.</strong>
          {built.errors.map((error) => (
            <p key={error.code} style={{ margin: 0 }}>
              {error.message}
            </p>
          ))}
        </div>
      ) : (
        <>
          <TransportBar
            stepIndex={playback.stepIndex}
            stepCount={trace?.steps.length ?? 0}
            playing={playback.playing}
            speed={playback.speed}
            onStepChange={playback.setStepIndex}
            onPlayingChange={playback.setPlaying}
            onSpeedChange={playback.setSpeed}
          />
          <NarrationPanel step={step} />
          <ContradictionDiagram from={from} to={to} reached={playback.stepIndex} total={trace?.steps.length ?? 0} />
        </>
      )}
    </div>
  )
}

function ProblemPicker({
  legend,
  hint,
  value,
  onChange,
  markDecidable = false,
}: {
  legend: string
  hint: string
  value: string
  onChange: (id: string) => void
  markDecidable?: boolean
}): React.JSX.Element {
  return (
    <fieldset className="tnt-card" style={{ margin: 0 }}>
      <legend className="tnt-sm" style={{ fontWeight: 600, padding: '0 var(--tnt-space-2)' }}>
        {legend}
      </legend>
      <p className="tnt-meta" style={{ margin: '0 0 var(--tnt-space-2)' }}>
        {hint}
      </p>
      <div className="tnt-stack-sm">
        {PROBLEMS.map((problem) => (
          <label key={problem.id} className="tnt-field-row" style={{ alignItems: 'baseline', cursor: 'pointer' }}>
            <input
              type="radio"
              name={legend}
              checked={value === problem.id}
              onChange={() => onChange(problem.id)}
            />
            <span>
              {problem.name}{' '}
              <span className="tnt-xs" style={{ color: STATUS_COLOUR[problem.status] }}>
                ({STATUS_LABEL[problem.status]})
              </span>
              {markDecidable && !isKnownHard(problem) ? (
                <span className="tnt-muted tnt-xs"> — no reduction may start here</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Fig. 8.7, drawn from the pair rather than from the trace: the boxes are the
 * same whichever reduction is showing, and the trace's own steps are what move.
 */
function ContradictionDiagram({
  from,
  to,
  reached,
  total,
}: {
  from: Problem | undefined
  to: Problem | undefined
  reached: number
  total: number
}): React.JSX.Element {
  if (from === undefined || to === undefined) return <></>
  const atEnd = total > 0 && reached >= total - 1

  return (
    <figure className="tnt-stack-sm" style={{ margin: 0 }}>
      <div className="tnt-card tnt-row tnt-sm">
        <Box label={`instance of ${from.name}`} />
        <span aria-hidden>→</span>
        <Box label="Construct" strong />
        <span aria-hidden>→</span>
        <Box label={`instance of ${to.name}`} />
        <span aria-hidden>→</span>
        <Box label="Decide" strong dashed />
        <span aria-hidden>→</span>
        <span className="tnt-mono">yes / no</span>
      </div>
      <figcaption className="tnt-meta">
        Fig. 8.7. The dashed box is the algorithm assumed to exist.{' '}
        {atEnd
          ? `It does not: the chain would decide ${from.name.toLowerCase()}, and nothing does.`
          : 'Step to the end to see why it cannot.'}
      </figcaption>
    </figure>
  )
}

function Box({ label, strong = false, dashed = false }: { label: string; strong?: boolean; dashed?: boolean }): React.JSX.Element {
  return (
    <span
      style={{
        padding: '6px 10px',
        border: `1px ${dashed ? 'dashed' : 'solid'} var(--tnt-border)`,
        borderRadius: 'var(--tnt-radius)',
        background: 'var(--tnt-bg)',
        fontWeight: strong ? 600 : 400,
      }}
    >
      {label}
    </span>
  )
}
