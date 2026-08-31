'use client'

/**
 * The board's side panel — design artboard 07's right column: the δ table
 * that has been growing as the machine did, the one-line prompt, the input
 * with Try chips, the transport walking the engine's trace, and the verdict.
 */

import type { FiniteAutomaton, Read, Step, TraceResult } from '@tape-n-trace/engine'
import { EPSILON_GLYPH, TransportBar } from '@tape-n-trace/ui'
import type { Playback } from '../../lib/use-playback'
import type { Lit } from './board-canvas'
import { pretty } from './board-text'

export interface BoardPanelProps {
  open: boolean
  machine: FiniteAutomaton
  symbols: Read[]
  lit: Lit
  hint: string
  runnable: boolean
  input: string
  onInput: (value: string) => void
  ran: string | null
  onRun: (word: string) => void
  playback: Playback
  step: Step | null
  verdict: TraceResult | null
}

const TRIES = ['0011', '']

export function BoardPanel({
  open,
  machine,
  symbols,
  lit,
  hint,
  runnable,
  input,
  onInput,
  ran,
  onRun,
  playback,
  step,
  verdict,
}: BoardPanelProps): React.JSX.Element {
  return (
    <aside className="tnt-board-panel" aria-label="Transition table and run" hidden={!open}>
      <div className="tnt-board-panel-head">
        <span className="tnt-label">Transition table</span>
        <span className="tnt-meta">δ</span>
      </div>

      <table className="tnt-board-table">
        <thead>
          <tr>
            <th scope="col">State</th>
            {symbols.map((read) => (
              <th key={read ?? 'eps'} scope="col">
                {read ?? EPSILON_GLYPH}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {machine.states.length === 0 ? (
            <tr>
              <td colSpan={symbols.length + 1} className="tnt-board-table-empty">
                no states yet
              </td>
            </tr>
          ) : (
            machine.states.map((id) => (
              <tr key={id} data-role={lit.states.get(id)}>
                <th scope="row">
                  {id === machine.start ? '→ ' : ''}
                  {machine.accepting.includes(id) ? '* ' : ''}
                  {pretty(id)}
                </th>
                {symbols.map((read) => {
                  const targets = machine.transitions.filter((t) => t.from === id && t.read === read).map((t) => pretty(t.to))
                  return (
                    <td key={read ?? 'eps'} data-empty={targets.length === 0 ? 'true' : undefined}>
                      {targets.length === 0 ? '—' : targets.join(', ')}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="tnt-board-hint">{hint}</p>

      <div className="tnt-board-run">
        <form
          className="tnt-board-input-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (runnable) onRun(input)
          }}
        >
          <input
            value={input}
            onChange={(event) => onInput(event.target.value)}
            className="tnt-board-input"
            aria-label="Input string"
            spellCheck={false}
            autoComplete="off"
            placeholder={runnable ? 'type a string' : 'finish the machine first'}
          />
          <div className="tnt-board-tries" role="group" aria-label="Try">
            {TRIES.map((word) => (
              <button
                key={word || 'eps'}
                type="button"
                className="tnt-board-try"
                aria-pressed={ran === word}
                disabled={!runnable}
                onClick={() => {
                  onInput(word)
                  onRun(word)
                }}
              >
                {word === '' ? EPSILON_GLYPH : word}
              </button>
            ))}
          </div>
        </form>

        <TransportBar
          stepIndex={playback.stepIndex}
          stepCount={playback.stepCount}
          playing={playback.playing}
          speed={playback.speed}
          onStepChange={playback.setStepIndex}
          onPlayingChange={(playing) => {
            if (playback.stepCount === 0 && runnable && playing) onRun(input)
            else playback.setPlaying(playing)
          }}
          onSpeedChange={playback.setSpeed}
          narration={step?.narration}
          disabled={!runnable}
        />

        <p className="tnt-board-narration" aria-live="polite">
          {step?.narration ?? ''}
        </p>

        {verdict === null || verdict.type !== 'acceptance' ? null : (
          <div className={`tnt-banner ${verdict.accepted ? 'tnt-banner-good' : 'tnt-banner-bad'} tnt-board-verdict`} role="status">
            <span className="tnt-banner-headline">{verdict.accepted ? 'Accepted' : 'Rejected'}</span>
            <span className="tnt-banner-detail">{verdict.note ?? ''}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
