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
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="tnt-card" style={{ display: 'grid', gap: 6 }}>
        <strong style={{ fontSize: 15 }}>{preset.title}</strong>
        <p style={{ margin: 0, fontSize: 14 }}>{preset.blurb}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4, flex: '1 1 220px' }}>
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            Input string
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
          Run both
        </button>
        {preset.suggested.map((w) => (
          <button
            key={w || 'empty'}
            type="button"
            onClick={() => {
              setInput(w)
              run(w)
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
            {w === '' ? 'ε' : w}
          </button>
        ))}
      </form>

      <ValidationErrors errors={errors} />

      {snapshot === null ? null : (
        <>
          <section aria-label="Running time" className="tnt-card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Counter label="Moves of M" value={snapshot.mMoves} />
            <Counter label="Moves of N" value={snapshot.nMoves} />
            <Counter label="Theorem 8.10's bound so far" value={bound} hint={`Σ (4n + 2k), k = ${k}`} />
            <span className="tnt-muted" style={{ fontSize: 13, flexBasis: '100%' }}>
              Each simulated move costs N at most 4n + 2k of its own after n moves of M — so n moves of M cost
              N O(n²). The ratio grows as the run goes on; watch the two counters drift apart.
            </span>
          </section>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <section aria-label="M">
              <h2 style={{ fontSize: 15 }}>M — {k} tapes</h2>
              <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'grid', gap: 10 }}>
                {snapshot.mConfig.tapes.map((tape, i) => (
                  <TapeStrip key={i} tape={tape} blank={preset.machine.blank} radius={6} tapeIndex={i} state={i === 0 ? snapshot.mConfig.state : undefined} label={`Tape ${i + 1}`} />
                ))}
                <div style={{ fontFamily: 'var(--tnt-mono)', fontSize: 13 }}>{tmIdText(snapshot.mConfig, preset.machine.blank)}</div>
              </div>
            </section>
            <section aria-label="N">
              <h2 style={{ fontSize: 15 }}>N — one tape, {2 * k} tracks</h2>
              <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'grid', gap: 10 }}>
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
                <div className="tnt-muted" style={{ fontSize: 12 }}>
                  ▲ marks where each head of M is; N's own state is <span style={{ fontFamily: 'var(--tnt-mono)' }}>{snapshot.current.state}</span>.
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
        <p role="status" className="tnt-card" style={{ margin: 0, fontSize: 14 }}>
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
      <div className="tnt-muted" style={{ fontSize: 12 }}>
        {label}
        {hint === undefined ? '' : ` (${hint})`}
      </div>
      <div style={{ fontFamily: 'var(--tnt-mono)', fontSize: 22 }} data-counter={label}>
        {value}
      </div>
    </div>
  )
}
