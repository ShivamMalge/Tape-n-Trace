'use client'

/**
 * Run one Turing machine — the shared middle of the simulator and editor pages,
 * laid out as design artboard 02: the input row with Try chips; a 1fr / 344px
 * grid whose left column is the diagram card, the tape card and the transport,
 * and whose right column is the narration, the ID sequence, the verdict and
 * the docs.
 *
 * The tape scrolls (head-fixed) or the head walks (tape-fixed), at the
 * student's choice; the ID sequence is written out in §8.2.3's notation; a
 * machine that runs past the move cap is stopped with the reason and a
 * "continue" offer in the amber banner, because non-halting is a fact about
 * Turing machines, not a failure of the page.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { isDeterministicTM, isOk, simulateTM, tmIdText } from '@tape-n-trace/engine'
import type { Sym, TmTrace, TuringMachine, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, TapeStrip, TransportBar } from '@tape-n-trace/ui'
import { DocsCard } from './docs-card'
import { IdSequence } from './id-sequence'
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
  /** Cards for the right column, under the verdict — the machine's notes. */
  aside?: ReactNode
  /** Open with this string already run — `?input=0011` on the page. */
  initialInput?: string | undefined
}

type Mode = 'head-fixed' | 'tape-fixed'

export function TmRunner({
  machine,
  suggested = [],
  encodeInput,
  trackSeparator,
  subroutine,
  aside,
  initialInput,
}: TmRunnerProps): React.JSX.Element {
  /*
   * Computed during the first render rather than in a mount effect, so the
   * prerendered HTML and the hydrated client agree (simulateTM is pure, §2.5).
   */
  const initial = useMemo(() => {
    if (initialInput === undefined) return { trace: null, errors: [] as ValidationError[] }
    const symbols = encodeInput === undefined ? initialInput : encodeInput(initialInput)
    const result = simulateTM(machine, symbols, { maxSteps: MOVE_CAP })
    return isOk(result) ? { trace: result.value, errors: [] as ValidationError[] } : { trace: null, errors: result.errors }
  }, [machine, encodeInput, initialInput])

  const [input, setInput] = useState(initialInput ?? '')
  const [ran, setRan] = useState<string | null>(initialInput ?? null)
  const [cap, setCap] = useState(MOVE_CAP)
  const [trace, setTrace] = useState<TmTrace | null>(initial.trace)
  const [errors, setErrors] = useState<ValidationError[]>(initial.errors)
  const [mode, setMode] = useState<Mode>('head-fixed')
  const playback = usePlayback(trace)

  const run = useCallback(
    (word: string, maxSteps: number) => {
      const symbols = encodeInput === undefined ? word : encodeInput(word)
      const result = simulateTM(machine, symbols, { maxSteps })
      setRan(word)
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
  const ids = useMemo(
    () => (trace === null ? [] : trace.steps.map((s) => tmIdText(s.snapshot.current, machine.blank))),
    [trace, machine.blank],
  )
  const nondeterministic = useMemo(() => !isDeterministicTM(machine), [machine])
  const stopped = trace?.result.type === 'incomplete'

  const tapeCount = machine.tapes
  const inputHint = `blank is ${machine.blank}; ${tapeCount > 1 ? `${tapeCount} tapes` : 'one tape'}`

  return (
    <div className="tnt-stack-lg">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setCap(MOVE_CAP)
          run(input, MOVE_CAP)
        }}
        className="tnt-input-row"
      >
        <label className="tnt-input-label" htmlFor="tm-input">
          Input
        </label>
        <input
          id="tm-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-description={inputHint}
          className="tnt-input tnt-input-mono tnt-input-lg"
        />
        <button type="submit" className="tnt-btn tnt-btn-primary">
          Run
        </button>
        {suggested.length > 0 ? (
          <>
            <span className="tnt-divider" aria-hidden="true" />
            <div className="tnt-try" role="group" aria-label="Try">
              <span className="tnt-input-label">Try</span>
              {suggested.map((word) => (
                <button
                  key={word || 'empty'}
                  type="button"
                  className="tnt-chip"
                  aria-pressed={ran === word}
                  onClick={() => {
                    setInput(word)
                    setCap(MOVE_CAP)
                    run(word, MOVE_CAP)
                  }}
                >
                  {word === '' ? 'ε (blank tape)' : word}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </form>

      <ValidationErrors errors={errors} />

      <div className="tnt-panels-aside">
        <div className="tnt-stack-lg">
          <div className="tnt-diagram-card">
            <AutomatonRenderer machine={drawable} step={step} instanceId="tm" />
          </div>

          {current === null || snapshot === null ? null : (
            <section aria-label="Tape" className="tnt-card tnt-tape-card">
              <div className="tnt-card-head">
                <h2 className="tnt-label">
                  {tapeCount > 1 ? 'Tapes' : 'Tape'}
                  <span className="tnt-normal"> · move {snapshot.moves}</span>
                  {subroutine !== undefined && subroutine.states.includes(current.state) ? (
                    <span className="tnt-normal"> · inside {subroutine.name}</span>
                  ) : null}
                </h2>
                <div className="tnt-seg tnt-seg-sm" role="radiogroup" aria-label="Convention">
                  {(['head-fixed', 'tape-fixed'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      aria-pressed={mode === m}
                      className="tnt-seg-btn"
                      onClick={() => setMode(m)}
                    >
                      {m === 'head-fixed' ? 'head fixed' : 'tape fixed'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tnt-stack">
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
                    label={tapeCount > 1 ? `Tape ${i + 1}` : 'Tape'}
                  />
                ))}
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

          {snapshot !== null && nondeterministic ? (
            <section className="tnt-card" aria-label="Branch tree">
              <div className="tnt-card-head">
                <h2 className="tnt-label">Branch tree</h2>
                <span className="tnt-meta">Theorem 8.11</span>
              </div>
              <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: '0 0 var(--tnt-space-3)' }}>
                Every ID the machine could be in, placed by moves made — the breadth-first order a deterministic
                machine would explore them in. A branch with no move dies where it stands.
              </p>
              <div className="tnt-scroll-x">
                <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
              </div>
            </section>
          ) : null}
        </div>

        <div className="tnt-stack">
          <NarrationPanel step={step} label={current?.state} />

          <IdSequence
            ids={ids}
            current={playback.stepIndex}
            note="§8.2.3: the state written immediately left of the scanned cell."
          />

          {trace === null || stopped ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}

          {stopped ? (
            <div role="status" aria-label="Move cap" className="tnt-banner tnt-banner-warn">
              <span className="tnt-banner-headline">Stopped</span>
              <span className="tnt-banner-detail">
                Stopped after {cap} moves without halting. No verdict yet — this is not a rejection. A Turing machine
                need not halt (§8.2.6), and no program can tell in general whether this one will; the page can only
                run it further.
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = cap + MOVE_CAP
                  setCap(next)
                  run(input, next)
                }}
                className="tnt-btn tnt-btn-banner"
              >
                Continue for {MOVE_CAP} more moves
              </button>
            </div>
          ) : null}

          {aside}

          <DocsCard title="Reading an instantaneous description" cite="§8.2.2">
            The state symbol is written immediately to the left of the cell being scanned, so{' '}
            <span className="tnt-mono">X0q₁11</span> means the head is on the third cell.
          </DocsCard>
        </div>
      </div>
    </div>
  )
}
