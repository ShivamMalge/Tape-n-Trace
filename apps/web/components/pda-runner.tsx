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
  const [copied, setCopied] = useState(false)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          run(input)
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <label style={{ display: 'grid', gap: 4, flex: '1 1 240px' }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Input string (over {`{${machine.inputAlphabet.join(', ')}}`})
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
                run(word)
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
              {word === '' ? 'ε (empty)' : word}
            </button>
          ))}
        </div>
      ) : null}

      <ValidationErrors errors={errors} />
      {trace === null ? null : <VerdictBanner result={trace.result} meta={trace.meta} />}

      <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
        <AutomatonRenderer machine={drawable} step={step} instanceId="pda" />
      </div>

      {snapshot === null || focus === null ? null : (
        <section aria-label="Current instantaneous description">
          <h2 style={{ fontSize: 15 }}>The current ID</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            An instantaneous description (q, w, γ) is the whole truth about a run: state, unread
            input, stack. These three panels are that triple, for the branch this step is expanding.
          </p>
          <div
            className="tnt-card"
            style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', background: 'var(--tnt-bg)' }}
          >
            <div>
              <div className="tnt-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                State
              </div>
              <div
                style={{
                  fontFamily: 'var(--tnt-mono)',
                  fontSize: 16,
                  padding: '6px 14px',
                  border: '2px solid var(--tnt-current)',
                  borderRadius: 999,
                  display: 'inline-block',
                }}
              >
                {focus.state}
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 180 }}>
              <div className="tnt-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Input — {focus.position} of {snapshot.input.length} consumed
              </div>
              <InputStrip input={snapshot.input} position={focus.position} step={step} />
            </div>
            <StackColumn stack={focus.stack} />
            <div style={{ flexBasis: '100%', fontFamily: 'var(--tnt-mono)', fontSize: 14 }}>
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
          <h2 style={{ fontSize: 15 }}>Branch tree</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            Every guess the machine is running at once, placed by input consumed. A branch with no
            move dies where it stands; a branch that would repeat an ID already explored is closed,
            because repeating a configuration can never reach anything new.
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', overflowX: 'auto' }}>
            <BranchTree nodes={snapshot.nodes} input={snapshot.input} step={step} />
          </div>
        </section>
      )}

      {log === '' ? null : (
        <section aria-label="ID sequence">
          <h2 style={{ fontSize: 15 }}>The ID sequence</h2>
          <p className="tnt-muted" style={{ fontSize: 13, marginTop: 0 }}>
            The run in the notation of §6.1.4 — the exact artefact an exam answer reproduces. On an
            accepted string this is the accepting computation; on a rejected one, the attempt that
            got furthest.
          </p>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'grid', gap: 8 }}>
            <pre
              style={{
                margin: 0,
                fontFamily: 'var(--tnt-mono)',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                userSelect: 'text',
              }}
            >
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
                style={{
                  fontSize: 13,
                  padding: '4px 12px',
                  borderRadius: 'var(--tnt-radius)',
                  border: '1px solid var(--tnt-border)',
                  background: 'var(--tnt-bg)',
                  color: 'var(--tnt-text)',
                  cursor: 'pointer',
                }}
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
