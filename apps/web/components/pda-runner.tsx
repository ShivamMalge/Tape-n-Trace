'use client'

/**
 * Run one PDA — the shared middle of the simulator page and the editor page,
 * laid out as design artboard 02: the input row with Try chips; the diagram
 * card, the current-ID card (state, remaining input, stack — the triple
 * (q, w, γ) as three synced panels), the transport and the branch tree on the
 * left; narration, the ID sequence, the verdict and the docs on the right.
 *
 * The ID sequence is the full run as selectable text in exactly the notation
 * the exam wants reproduced (§6.1.4). Nondeterministic runs get the branch
 * tree, as NFA runs do; the three panels then follow the branch being expanded
 * at the current step.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { idLog, idToText, isOk, simulatePDA } from '@tape-n-trace/engine'
import type { Highlight, PDA, PdaBranchNode, PdaSnapshot, Step, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, InputStrip, TransportBar } from '@tape-n-trace/ui'
import { IdSequence } from './id-sequence'
import { NarrationPanel } from './narration-panel'
import { VerdictBanner } from './verdict-banner'
import { ValidationErrors } from './validation-errors'
import { StackColumn } from './stack-column'
import { usePlayback } from '../lib/use-playback'
import { pdaToDrawable } from '../lib/pda-drawable'

type PdaTrace = Trace<Step<PdaSnapshot>>

export interface PdaRunnerProps {
  machine: PDA
  suggested?: string[]
  /** Cards for the right column, under the verdict — the machine's notes. */
  aside?: ReactNode
}

export function PdaRunner({ machine, suggested = [], aside }: PdaRunnerProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const [ran, setRan] = useState<string | null>(null)
  const [trace, setTrace] = useState<PdaTrace | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const playback = usePlayback(trace)

  const run = useCallback(
    (word: string) => {
      const result = simulatePDA(machine, word)
      setRan(word)
      if (isOk(result)) {
        setTrace(result.value)
        setErrors([])
      } else {
        setTrace(null)
        setErrors(result.errors)
      }
    },
    [machine],
  )

  const drawable = useMemo(() => pdaToDrawable(machine), [machine])
  const step = trace?.steps[playback.stepIndex] ?? null
  const snapshot = step?.snapshot ?? null

  // The branch the narration is talking about: the one being expanded at this
  // step, or the accepting one once the run is over.
  const focus = useMemo<PdaBranchNode | null>(() => {
    if (snapshot === null) return null
    const expandingId = step?.highlight.find(
      (h): h is Extract<Highlight, { type: 'treeNode' }> => h.type === 'treeNode' && h.role === 'expanding',
    )?.id
    const expanding = expandingId === undefined ? undefined : snapshot.nodes.find((n) => n.id === expandingId)
    const accepting = snapshot.status === 'accepted' ? snapshot.nodes.find((n) => n.status === 'accepting') : undefined
    return accepting ?? expanding ?? snapshot.nodes[0] ?? null
  }, [snapshot, step])

  /**
   * The ID sequence is one path — the accepting computation, or the attempt that
   * got furthest — so its IDs do not map one-to-one onto steps; the last is lit
   * once the run has reached its end, none before.
   */
  const ids = useMemo(() => (trace === null ? [] : idLog(trace).split(' ⊢ ')), [trace])
  const lit = playback.stepCount > 0 && playback.stepIndex === playback.stepCount - 1 ? ids.length - 1 : -1

  return (
    <div className="tnt-stack-lg">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        className="tnt-input-row"
      >
        <label className="tnt-input-label" htmlFor="pda-input">
          Input
        </label>
        <input
          id="pda-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-description={`over {${machine.inputAlphabet.join(', ')}}`}
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
                    run(word)
                  }}
                >
                  {word === '' ? 'ε (empty)' : word}
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
            <AutomatonRenderer machine={drawable} step={step} instanceId="pda" />
          </div>

          {snapshot === null || focus === null ? null : (
            <section aria-label="Current instantaneous description" className="tnt-card">
              <div className="tnt-card-head">
                <h2 className="tnt-label">Current ID · (q, w, γ)</h2>
                <span className="tnt-meta">state · unread input · stack</span>
              </div>
              <div className="tnt-id-panels">
                <div>
                  <div className="tnt-caption">State</div>
                  <div className="tnt-state-pill">{focus.state}</div>
                </div>
                <div className="tnt-id-panels-input">
                  <div className="tnt-caption">
                    Input — {focus.position} of {snapshot.input.length} consumed
                  </div>
                  <InputStrip input={snapshot.input} position={focus.position} step={step} />
                </div>
                <StackColumn stack={focus.stack} />
                <div className="tnt-mono tnt-id-panels-id">
                  {idToText(focus.state, snapshot.input.slice(focus.position), focus.stack)}
                </div>
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

          {snapshot === null ? null : (
            <section className="tnt-card" aria-label="Branch tree">
              <div className="tnt-card-head">
                <h2 className="tnt-label">Branch tree</h2>
                <span className="tnt-meta">every guess at once</span>
              </div>
              <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: '0 0 var(--tnt-space-3)' }}>
                Every guess the machine is running at once, placed by input consumed. A branch with no move dies
                where it stands; a branch that would repeat an ID already explored is closed, because repeating a
                configuration can never reach anything new.
              </p>
              <div className="tnt-scroll-x">
                <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
              </div>
            </section>
          )}
        </div>

        <div className="tnt-stack">
          <NarrationPanel step={step} label={focus?.state} />
          <IdSequence
            ids={ids}
            current={lit}
            note="§6.1.4: the accepting computation, or on a rejected string the attempt that got furthest."
          />
          {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}
          {aside}
        </div>
      </div>
    </div>
  )
}
