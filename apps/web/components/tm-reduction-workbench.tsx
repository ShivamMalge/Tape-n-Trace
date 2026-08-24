'use client'

/**
 * Many tapes to one — Theorem 8.9 animated, with Theorem 8.10's cost counted.
 *
 * M's tapes on the left, N's single tape of 2k tracks on the right: a head
 * marker row and a contents row per tape of M. Each step is one move of N;
 * M advances when N has finished simulating a move. The counters are the
 * point: the quadratic slowdown is watched, not quoted.
 */

import { useMemo, useState } from 'react'
import { TM_PRESETS, isOk, simulateReduction, tmIdText } from '@tape-n-trace/engine'
import type { ReductionTrace, TmPreset, ValidationError } from '@tape-n-trace/engine'
import { TapeStrip, TransportBar } from '@tape-n-trace/ui'
import { NarrationPanel } from './narration-panel'
import { ValidationErrors } from './validation-errors'
import { usePlayback } from '../lib/use-playback'

const MULTITAPE = TM_PRESETS.filter((p) => p.machine.tapes > 1)

const formatTrack = (row: string): string => (row.startsWith('^') ? `▲${row.slice(1)}` : row.slice(1))

export function TmReductionWorkbench(): React.JSX.Element {
  const preset = MULTITAPE[0] as TmPreset
  const [input, setInput] = useState('0011')
  const [trace, setTrace] = useState<ReductionTrace | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const playback = usePlayback(trace)

  const run = (word: string): void => {
    const result = simulateReduction(preset.machine, word, { maxSteps: 3000 })
    if (isOk(result)) {
      setTrace(result.value)
      setErrors([])
    } else {
      setTrace(null)
      setErrors(result.errors)
    }
  }

  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot ?? null
  const k = preset.machine.tapes
  const bound = useMemo(() => {
    if (snapshot === null) return 0
    let total = 0
    for (let i = 1; i <= snapshot.mMoves; i++) total += 4 * i + 2 * k
    return total
  }, [snapshot, k])

  return (
    <div className="tnt-stack">
      <div className="tnt-card tnt-stack-sm">
        <strong>{preset.title}</strong>
        <p style={{ margin: 0 }}>{preset.blurb}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        className="tnt-row tnt-row-end"
      >
        <label className="tnt-field" style={{ flex: '1 1 220px' }}>
          <span className="tnt-muted">Input string</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="tnt-input tnt-input-mono"
            style={{ width: '100%' }}
          />
        </label>
        <button type="submit" className="tnt-btn tnt-btn-primary">
          Run both
        </button>
        {preset.suggested.map((w) => (
          <button
            key={w || 'empty'}
            type="button"
            className="tnt-chip"
            style={{ fontFamily: 'var(--tnt-mono)' }}
            onClick={() => {
              setInput(w)
              run(w)
            }}
          >
            {w === '' ? 'ε' : w}
          </button>
        ))}
      </form>

      <ValidationErrors errors={errors} />

      {snapshot === null ? null : (
        <>
          <section
            aria-label="Running time"
            className="tnt-card tnt-row tnt-row-baseline"
            style={{ gap: 'var(--tnt-space-5)' }}
          >
            <Counter label="Moves of M" value={snapshot.mMoves} />
            <Counter label="Moves of N" value={snapshot.nMoves} />
            <Counter label="Theorem 8.10's bound so far" value={bound} hint={`Σ (4n + 2k), k = ${k}`} />
            <span className="tnt-muted tnt-sm" style={{ flexBasis: '100%' }}>
              Each simulated move costs N at most 4n + 2k of its own after n moves of M — so n moves of M cost
              N O(n²). The ratio grows as the run goes on; watch the two counters drift apart.
            </span>
          </section>

          <div className="tnt-panels">
            <section aria-label="M">
              <h2>M — {k} tapes</h2>
              <div className="tnt-card tnt-stack tnt-card-plain">
                {snapshot.mConfig.tapes.map((tape, i) => (
                  <TapeStrip key={i} tape={tape} blank={preset.machine.blank} radius={6} tapeIndex={i} state={i === 0 ? snapshot.mConfig.state : undefined} label={`Tape ${i + 1}`} />
                ))}
                <div className="tnt-mono tnt-sm">{tmIdText(snapshot.mConfig, preset.machine.blank)}</div>
              </div>
            </section>
            <section aria-label="N">
              <h2>N — one tape, {2 * k} tracks</h2>
              <div className="tnt-card tnt-stack tnt-card-plain">
                {snapshot.current.tapes.map((tape, i) => (
                  <TapeStrip
                    key={i}
                    tape={tape}
                    blank={snapshot.single.blank}
                    radius={6}
                    step={step}
                    tapeIndex={i}
                    trackSeparator="|"
                    formatRow={formatTrack}
                    label="N's tape"
                  />
                ))}
                <div className="tnt-muted tnt-xs">
                  ▲ marks where each head of M is; N's own state is <span className="tnt-mono">{snapshot.current.state}</span>.
                </div>
              </div>
            </section>
          </div>
        </>
      )}

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

      {trace === null ? null : (
        <p role="status" className="tnt-card" style={{ margin: 0 }}>
          {trace.result.type === 'acceptance'
            ? trace.result.note
            : trace.result.type === 'incomplete'
              ? trace.result.reason
              : ''}
        </p>
      )}
    </div>
  )
}

function Counter({ label, value, hint }: { label: string; value: number; hint?: string }): React.JSX.Element {
  return (
    <div>
      <div className="tnt-meta">
        {label}
        {hint === undefined ? '' : ` (${hint})`}
      </div>
      <div className="tnt-mono" style={{ fontSize: 'var(--tnt-text-xl)' }} data-counter={label}>
        {value}
      </div>
    </div>
  )
}
