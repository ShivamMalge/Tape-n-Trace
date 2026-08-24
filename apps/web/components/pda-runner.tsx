'use client'

/**
 * Run one PDA — the shared middle of the simulator page and the editor page.
 *
 * The ID (q, w, γ) renders as three synced panels — state, remaining input,
 * stack — plus the full ID sequence as selectable text in exactly the notation
 * the exam wants reproduced. Nondeterministic runs get the branch tree, as NFA
 * runs do; the three panels then follow the branch being expanded at the
 * current step.
 */

import { useCallback, useMemo, useState } from 'react'
import { idLog, idToText, isOk, simulatePDA } from '@tape-n-trace/engine'
import type { Highlight, PDA, PdaBranchNode, PdaSnapshot, Step, Trace, ValidationError } from '@tape-n-trace/engine'
import { AutomatonRenderer, BranchTree, InputStrip, TransportBar } from '@tape-n-trace/ui'
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
}

export function PdaRunner({ machine, suggested = [] }: PdaRunnerProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const [trace, setTrace] = useState<PdaTrace | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const playback = usePlayback(trace)

  const run = useCallback(
    (word: string) => {
      const result = simulatePDA(machine, word)
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

  const log = useMemo(() => (trace === null ? '' : idLog(trace)), [trace])
  /**
   * What was put on the clipboard, not whether anything was. A boolean stuck on
   * "Copied" through the next run, so the button claimed the clipboard held an
   * ID sequence that was no longer on screen. Comparing against the current log
   * makes the label true by construction.
   */
  const [copiedLog, setCopiedLog] = useState<string | null>(null)
  const copied = copiedLog !== null && copiedLog === log

  return (
    <div className="tnt-stack">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        className="tnt-row tnt-row-end"
      >
        <label className="tnt-field" style={{ flex: '1 1 240px' }}>
          <span className="tnt-muted">
            Input string (over {`{${machine.inputAlphabet.join(', ')}}`})
          </span>
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
          Run
        </button>
      </form>

      {suggested.length > 0 ? (
        <div className="tnt-row tnt-row-tight">
          <span className="tnt-muted tnt-sm">Try:</span>
          {suggested.map((word) => (
            <button
              key={word || 'empty'}
              type="button"
              onClick={() => {
                setInput(word)
                run(word)
              }}
              className="tnt-chip tnt-mono"
            >
              {word === '' ? 'ε (empty)' : word}
            </button>
          ))}
        </div>
      ) : null}

      <ValidationErrors errors={errors} />
      {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}

      <div className="tnt-card tnt-card-plain">
        <AutomatonRenderer machine={drawable} step={step} instanceId="pda" />
      </div>

      {snapshot === null || focus === null ? null : (
        <section aria-label="Current instantaneous description">
          <h2>The current ID</h2>
          <p className="tnt-muted tnt-sm" style={{ marginTop: 0 }}>
            An instantaneous description (q, w, γ) is the whole truth about a run: state, unread
            input, stack. These three panels are that triple, for the branch this step is expanding.
          </p>
          <div
            className="tnt-card tnt-row"
            style={{ gap: 'var(--tnt-space-5)', alignItems: 'flex-start', background: 'var(--tnt-bg)' }}
          >
            <div>
              <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-1)' }}>
                State
              </div>
              <div className="tnt-mono tnt-lg" style={statePill}>
                {focus.state}
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 180 }}>
              <div className="tnt-meta" style={{ marginBottom: 'var(--tnt-space-1)' }}>
                Input — {focus.position} of {snapshot.input.length} consumed
              </div>
              <InputStrip input={snapshot.input} position={focus.position} step={step} />
            </div>
            <StackColumn stack={focus.stack} />
            <div className="tnt-mono" style={{ flexBasis: '100%' }}>
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

      <NarrationPanel step={step} />

      {snapshot === null ? null : (
        <section>
          <h2>Branch tree</h2>
          <p className="tnt-muted tnt-sm" style={{ marginTop: 0 }}>
            Every guess the machine is running at once, placed by input consumed. A branch with no
            move dies where it stands; a branch that would repeat an ID already explored is closed,
            because repeating a configuration can never reach anything new.
          </p>
          <div className="tnt-card tnt-scroll-x tnt-card-plain">
            <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
          </div>
        </section>
      )}

      {log === '' ? null : (
        <section aria-label="ID sequence">
          <h2>The ID sequence</h2>
          <p className="tnt-muted tnt-sm" style={{ marginTop: 0 }}>
            The run in the notation of §6.1.4 — the exact artefact an exam answer reproduces. On an
            accepted string this is the accepting computation; on a rejected one, the attempt that
            got furthest.
          </p>
          <div className="tnt-card tnt-stack-sm tnt-card-plain">
            <pre className="tnt-code-block" style={{ margin: 0, userSelect: 'text' }}>
              {log}
            </pre>
            <div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(log)
                    .then(() => setCopiedLog(log))
                    .catch(() => setCopiedLog(null))
                }}
                className="tnt-btn"
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

/**
 * The q of the ID, ringed in the current-step colour. `.tnt-tag` is the static
 * pill, but it is muted and hairline; this one is the highlight itself.
 */
const statePill: React.CSSProperties = {
  padding: 'var(--tnt-space-2) var(--tnt-space-3)',
  border: '2px solid var(--tnt-current)',
  borderRadius: 'var(--tnt-radius-full)',
  display: 'inline-block',
}
