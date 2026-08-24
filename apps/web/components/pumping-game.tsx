'use client'

/**
 * The pumping game controller.
 *
 * Every engine decision lives in the engine's reducer; this component renders
 * the current phase, feeds student moves in, and shows the errors the reducer
 * returns — which are the rules of the lemma, enforced as they are broken.
 */

import { useMemo, useState } from 'react'
import {
  advance,
  isOk,
  proofParagraph,
  pumpingLanguage,
  serialise,
  sessionTrace,
  startSession,
} from '@tape-n-trace/engine'
import type { GameMode, GameVariant, Move, PumpingSession } from '@tape-n-trace/engine'
import { SplitPicker, Segments } from './split-picker'
import { downloadText } from '../lib/export'

export interface PumpingGameProps {
  languageId: string
  mode: GameMode
  variant?: GameVariant
}

export function PumpingGame({ languageId, mode, variant = 'regular' }: PumpingGameProps): React.JSX.Element {
  const language = useMemo(() => pumpingLanguage(languageId), [languageId])
  const [session, setSession] = useState<PumpingSession | null>(() =>
    language === undefined ? null : startSession(language, mode, variant),
  )
  const [error, setError] = useState<string | null>(null)
  const [wInput, setWInput] = useState('')
  const [nInput, setNInput] = useState(3)
  const [iInput, setIInput] = useState(2)

  if (language === undefined || session === null) {
    return <p className="tnt-muted">No such language preset.</p>
  }

  const play = (move: Move): void => {
    const next = advance(language, session, move)
    if (isOk(next)) {
      setSession(next.value)
      setError(null)
    } else {
      setError(next.errors[0]?.message ?? 'That move is not legal.')
    }
  }

  const restart = (): void => {
    setSession(startSession(language, mode, variant))
    setError(null)
    setWInput('')
  }

  const latest = session.events.at(-1)
  const proof = proofParagraph(language, session)
  const over = session.phase === 'won' || session.phase === 'lost'

  return (
    <div className="tnt-stack">
      {/* The conversation so far — every move, in the engine's own words. */}
      <section className="tnt-card tnt-stack-sm" style={{ maxHeight: 300, overflowY: 'auto' }}>
        {session.events.map((event, i) => (
          <p key={i} style={{ margin: 0, opacity: i === session.events.length - 1 ? 1 : 0.65 }}>
            {event.narration}
          </p>
        ))}
      </section>

      {session.split !== null && (session.phase === 'pick-i' || over) ? (
        <Segments x={session.split.x} y={session.split.y} z={session.split.z} />
      ) : null}

      {error === null ? null : (
        <p role="alert" className="tnt-sm" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
          {error}
        </p>
      )}

      {session.phase === 'pick-w' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            play({ type: 'choose-w', w: wInput })
          }}
          className="tnt-row tnt-row-end"
        >
          <label className="tnt-field">
            <span className="tnt-muted">Your string w ∈ L, |w| ≥ {session.n}</span>
            <input
              value={wInput}
              onChange={(e) => setWInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={language.suggestedW(session.n)}
              className="tnt-input tnt-input-mono"
              style={{ minWidth: 220, fontSize: 'var(--tnt-text-lg)' }}
            />
          </label>
          <button type="submit" className="tnt-btn tnt-btn-primary">
            Challenge
          </button>
          <button type="button" className="tnt-btn" onClick={() => setWInput(language.suggestedW(session.n))}>
            Suggest one
          </button>
        </form>
      ) : null}

      {session.phase === 'pick-n' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            play({ type: 'choose-n', n: nInput })
          }}
          className="tnt-row tnt-row-end"
        >
          <label className="tnt-field">
            <span className="tnt-muted">Your claimed pumping length n (1–8)</span>
            <input
              type="number"
              min={1}
              max={8}
              value={nInput}
              onChange={(e) => setNInput(Number(e.target.value))}
              className="tnt-input tnt-input-mono"
              style={{ width: 90, fontSize: 'var(--tnt-text-lg)' }}
            />
          </label>
          <button type="submit" className="tnt-btn tnt-btn-primary">
            Claim it
          </button>
        </form>
      ) : null}

      {session.phase === 'pick-split' ? (
        <SplitPicker w={session.w} n={session.n} onSubmit={(split) => play({ type: 'choose-split', ...split })} />
      ) : null}

      {session.phase === 'pick-i' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            play({ type: 'choose-i', i: iInput })
          }}
          className="tnt-row tnt-row-end"
        >
          <label className="tnt-field">
            <span className="tnt-muted">Your i (0–12, and never 1)</span>
            <input
              type="number"
              min={0}
              max={12}
              value={iInput}
              onChange={(e) => setIInput(Number(e.target.value))}
              className="tnt-input tnt-input-mono"
              style={{ width: 90, fontSize: 'var(--tnt-text-lg)' }}
            />
          </label>
          <button type="submit" className="tnt-btn tnt-btn-primary">
            Pump
          </button>
          <button type="button" className="tnt-btn" onClick={() => play({ type: 'concede' })}>
            Concede
          </button>
        </form>
      ) : null}

      {over ? (
        <div className="tnt-row">
          <button type="button" className="tnt-btn tnt-btn-primary" onClick={restart}>
            Play again
          </button>
          <button
            type="button"
            className="tnt-btn"
            onClick={() =>
              downloadText(
                serialise(sessionTrace(language, session)),
                `pumping-${language.id}-${session.phase}.trace.json`,
                'application/json',
              )
            }
            title="The whole session as a trace — the same format every simulation uses"
          >
            Download the session
          </button>
        </div>
      ) : null}

      {proof === null ? null : (
        <section className="tnt-card tnt-stack-sm">
          <h2 style={{ margin: 0 }}>The proof, written out</h2>
          <p className="tnt-prose" style={{ margin: 0, lineHeight: 1.7 }}>
            {proof}
          </p>
          <button
            type="button"
            className="tnt-btn"
            onClick={() => downloadText(proof, `proof-${language.id}.txt`, 'text/plain')}
            style={{ justifySelf: 'start' }}
          >
            Download as text
          </button>
        </section>
      )}

      {latest?.phase === 'won' && session.mode === 'defend' ? (
        <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
          The language pumped — but note carefully: that does <strong>not</strong> prove it regular.
          The lemma runs one way only.
        </p>
      ) : null}
    </div>
  )
}
