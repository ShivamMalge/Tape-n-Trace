'use client'

/**
 * Run one Turing machine — the shared middle of the simulator and editor pages.
 *
 * The tape scrolls (head-fixed) or the head walks (tape-fixed), at the
 * student's choice; the ID sequence is written out beside it in §8.2.3's
 * notation; a machine that runs past the move cap is stopped with the reason
 * and a "continue" action, because non-halting is a fact about Turing
 * machines, not a failure of the page.
 */

import { useCallback, useMemo, useState } from 'react'
import { isDeterministicTM, isOk, simulateTM, tmIdLog, tmIdText } from '@tape-n-trace/engine'
import type { Sym, TmTrace, TuringMachine, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, TapeStrip, TransportBar } from '@tape-n-trace/ui'
import { NarrationPanel } from './narration-panel'
import { VerdictBanner } from './verdict-banner'
import { ValidationErrors } from './validation-errors'
import { usePlayback } from '../lib/use-playback'
import { tmToDrawable } from '../lib/tm-drawable'

/** Moves before the run is stopped, and how many more each "continue" adds. */
export const MOVE_CAP = 1000

export interface TmRunnerProps {
  machine: TuringMachine
  suggested?: string[]
  /** How a typed string becomes tape symbols (Example 8.7's tracks need it). */
  encodeInput?: ((word: string) => Sym[]) | undefined
  /** Split each cell on this separator to draw stacked tracks. */
  trackSeparator?: string | undefined
  /** A subroutine's states, drawn together as a box in the narration chip. */
  subroutine?: { name: string; states: string[] } | undefined
}

export function TmRunner({ machine, suggested = [], encodeInput, trackSeparator, subroutine }: TmRunnerProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const [cap, setCap] = useState(MOVE_CAP)
  const [trace, setTrace] = useState<TmTrace | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [mode, setMode] = useState<'head-fixed' | 'tape-fixed'>('head-fixed')
  const playback = usePlayback(trace)

  const run = useCallback(
    (word: string, maxSteps: number) => {
      const symbols = encodeInput === undefined ? word : encodeInput(word)
      const result = simulateTM(machine, symbols, { maxSteps })
      if (isOk(result)) {
        setTrace(result.value)
        setErrors([])
      } else {
        setTrace(null)
        setErrors(result.errors)
      }
    },
    [machine, encodeInput],
  )

  const drawable = useMemo(() => tmToDrawable(machine), [machine])
  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot ?? null
  const current = snapshot?.current ?? null
  const log = useMemo(() => (trace === null ? '' : tmIdLog(trace)), [trace])
  const nondeterministic = useMemo(() => !isDeterministicTM(machine), [machine])
  const stopped = trace?.result.type === 'incomplete'
  const [copied, setCopied] = useState(false)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setCap(MOVE_CAP)
          run(input, MOVE_CAP)
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4, flex: '1 1 240px' }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Input string (blank is {machine.blank}; {machine.tapes > 1 ? `${machine.tapes} tapes` : 'one tape'})
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            style={field}
          />
        </label>
        <button type="submit" style={primary}>
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
                setCap(MOVE_CAP)
                run(word, MOVE_CAP)
              }}
              style={chip}
            >
              {word === '' ? 'ε (blank tape)' : word}
            </button>
          ))}
        </div>
      ) : null}

      <ValidationErrors errors={errors} />
      {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}

      {stopped ? (
        <div role="status" aria-label="Move cap" className="tnt-card" style={{ borderLeft: '3px solid var(--tnt-marked)', display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Stopped after {cap} moves without halting. A Turing machine need not halt (§8.2.6), and no
            program can tell in general whether this one will — the page can only run it further.
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                const next = cap + MOVE_CAP
                setCap(next)
                run(input, next)
              }}
              style={primary}
            >
              Continue for {MOVE_CAP} more moves
            </button>
          </div>
        </div>
      ) : null}

      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        <AutomatonRenderer machine={drawable} step={step} instanceId="tm" />
      </div>

      {current === null || snapshot === null ? null : (
        <section aria-label="Tape" style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 15, margin: 0 }}>The tape{machine.tapes > 1 ? 's' : ''}</h2>
            <span className="tnt-muted" style={{ fontSize: 13 }}>
              move {snapshot.moves}
              {subroutine !== undefined && subroutine.states.includes(current.state) ? ` · inside ${subroutine.name}` : ''}
            </span>
            <fieldset style={{ border: 0, padding: 0, margin: 0, marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 13 }}>
              <legend className="tnt-muted" style={{ fontSize: 12, float: 'left', marginRight: 6 }}>
                Convention:
              </legend>
              {(['head-fixed', 'tape-fixed'] as const).map((m) => (
                <label key={m} style={{ display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" name="tape-mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                  {m === 'head-fixed' ? 'head fixed, tape scrolls' : 'tape fixed, head moves'}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'grid', gap: 10 }}>
            {current.tapes.map((tape, i) => (
              <TapeStrip
                key={i}
                tape={tape}
                blank={machine.blank}
                mode={mode}
                step={step}
                tapeIndex={i}
                state={i === 0 ? current.state : undefined}
                trackSeparator={trackSeparator}
                label={machine.tapes > 1 ? `Tape ${i + 1}` : 'Tape'}
              />
            ))}
            <div style={{ fontFamily: 'var(--tnt-mono)', fontSize: 14 }}>{tmIdText(current, machine.blank)}</div>
          </div>
        </section>
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

      {snapshot !== null && nondeterministic ? (
        <section>
          <h2 style={{ fontSize: 15 }}>Branch tree</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            Every ID the machine could be in, placed by moves made — the breadth-first order a
            deterministic machine would explore them in (Theorem 8.11). A branch with no move dies
            where it stands.
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
            <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
          </div>
        </section>
      ) : null}

      {log === '' ? null : (
        <section aria-label="ID sequence">
          <h2 style={{ fontSize: 15 }}>The ID sequence</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            §8.2.3's notation: the state written immediately left of the scanned cell, the tape
            shown from its leftmost nonblank to its rightmost, widened to the head when it stands on
            a blank. Copy it straight into an answer.
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'grid', gap: 8 }}>
            <pre style={{ margin: 0, fontFamily: 'var(--tnt-mono)', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}>
              {log}
            </pre>
            <div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(log)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }}
                style={chip}
              >
                {copied ? 'Copied' : 'Copy the sequence'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

const field: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 15,
  padding: '7px 9px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  width: '100%',
}

const primary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-current)',
  background: 'var(--tnt-current)',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
}

const chip: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 13,
  padding: '3px 9px',
  borderRadius: 999,
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  cursor: 'pointer',
}
