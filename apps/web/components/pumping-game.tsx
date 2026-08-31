'use client'

/**
 * The pumping game controller — design artboard 05: the round as alternating
 * move cards ("Engine · move 1", "You · move 2" with its blue border), the
 * verdict as a banner, and the proof written out with Copy.
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
  const [copied, setCopied] = useState<string | null>(null)

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
  const yourTurn = !over

  // Who made each move: the engine opens in prove mode (it announces n), the
  // student opens in defend mode (they claim n); the two then alternate.
  const by = (i: number): 'engine' | 'you' => ((i % 2 === 0) === (mode === 'prove') ? 'engine' : 'you')
  const past = session.events.slice(0, -1)
  const verdictEvent = over ? latest : undefined
  const moves = over ? past : session.events

  return (
    <div className="tnt-stack-lg">
      <div className="tnt-round-head">
        <h2>
          Is <span className="tnt-mono">{language.notation}</span>{' '}
          {variant === 'cfl' ? 'context-free' : 'regular'}?
        </h2>
        <span style={{ flex: 1 }} />
        <span className="tnt-meta">
          {mode === 'prove' ? 'you attack · engine defends' : 'you defend · engine challenges'}
        </span>
      </div>

      <div className="tnt-round">
        {moves.map((event, i) => (
          <section key={i} className="tnt-card tnt-move" data-by={by(i)} data-past={i < moves.length - 1 || over ? 'true' : undefined}>
            <div className="tnt-card-head">
              <h3 className="tnt-label">
                {by(i) === 'engine' ? 'Engine' : 'You'} · move {i + 1}
              </h3>
              {i === 1 && session.w !== '' ? <span className="tnt-meta">|w| = {session.w.length}</span> : null}
            </div>
            <p className="tnt-move-text">{event.narration}</p>
            {i === session.events.length - 1 && session.split !== null && (session.phase === 'pick-i' || over) ? (
              <Segments x={session.split.x} y={session.split.y} z={session.split.z} />
            ) : null}
          </section>
        ))}

        {yourTurn ? (
          <section className="tnt-card tnt-move" data-by="you" aria-label="Your move">
            <div className="tnt-card-head">
              <h3 className="tnt-label">You · move {session.events.length + 1}</h3>
              <span className="tnt-meta">
                {session.phase === 'pick-w'
                  ? `w ∈ L, |w| ≥ ${session.n}`
                  : session.phase === 'pick-n'
                    ? '1 ≤ n ≤ 8'
                    : session.phase === 'pick-split'
                      ? `|xy| ≤ ${session.n}, y ≠ ε`
                      : 'i ≥ 0, i ≠ 1'}
              </span>
            </div>

            {error === null ? null : (
              <p role="alert" className="tnt-editor-error" style={{ margin: 0, borderTop: 0, borderRadius: 4 }}>
                <span className="tnt-editor-where">rule</span>
                <span>{error}</span>
              </p>
            )}

            {session.phase === 'pick-w' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  play({ type: 'choose-w', w: wInput })
                }}
                className="tnt-stack"
              >
                <label className="tnt-field">
                  <span className="tnt-input-label">Your string w</span>
                  <input
                    value={wInput}
                    onChange={(e) => setWInput(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={language.suggestedW(session.n)}
                    className="tnt-input tnt-input-mono tnt-input-lg"
                  />
                </label>
                <div className="tnt-row">
                  <button type="submit" className="tnt-btn tnt-btn-primary">
                    Challenge
                  </button>
                  <button type="button" className="tnt-btn" onClick={() => setWInput(language.suggestedW(session.n))}>
                    Suggest one
                  </button>
                </div>
              </form>
            ) : null}

            {session.phase === 'pick-n' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  play({ type: 'choose-n', n: nInput })
                }}
                className="tnt-stack"
              >
                <label className="tnt-field">
                  <span className="tnt-input-label">Your claimed pumping length n</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={nInput}
                    onChange={(e) => setNInput(Number(e.target.value))}
                    className="tnt-input tnt-input-mono tnt-input-lg"
                    style={{ width: 120, minWidth: 0 }}
                  />
                </label>
                <div>
                  <button type="submit" className="tnt-btn tnt-btn-primary">
                    Claim it
                  </button>
                </div>
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
                className="tnt-stack"
              >
                <label className="tnt-field">
                  <span className="tnt-input-label">Your i (0–12, and never 1)</span>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={iInput}
                    onChange={(e) => setIInput(Number(e.target.value))}
                    className="tnt-input tnt-input-mono tnt-input-lg"
                    style={{ width: 120, minWidth: 0 }}
                  />
                </label>
                <div className="tnt-row">
                  <button type="submit" className="tnt-btn tnt-btn-primary">
                    Pump
                  </button>
                  <button type="button" className="tnt-btn" onClick={() => play({ type: 'concede' })}>
                    Concede
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>

      {verdictEvent === undefined ? null : (
        <div
          role="status"
          className={`tnt-banner ${session.phase === 'won' ? 'tnt-banner-good' : 'tnt-banner-warn'}`}
        >
          <span className="tnt-banner-headline">Engine · move {session.events.length}</span>
          <span className="tnt-banner-detail">{verdictEvent.narration}</span>
        </div>
      )}

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
        <section className="tnt-card tnt-proof" aria-label="The proof, written out">
          <div className="tnt-card-head">
            <h2 className="tnt-label">The proof, written out</h2>
            <div className="tnt-row tnt-row-tight">
              <button
                type="button"
                className="tnt-btn tnt-btn-copy"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(proof)
                    .then(() => setCopied(proof))
                    .catch(() => setCopied(null))
                }}
              >
                {copied === proof ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="tnt-btn tnt-btn-copy"
                onClick={() => downloadText(proof, `proof-${language.id}.txt`, 'text/plain')}
              >
                Download as text
              </button>
            </div>
          </div>
          <p className="tnt-proof-text">{proof}</p>
          <p className="tnt-meta" style={{ margin: '14px 0 0' }}>
            Pattern after Hopcroft 2e §4.1.2
          </p>
        </section>
      )}

      {latest?.phase === 'won' && session.mode === 'defend' ? (
        <p className="tnt-prose tnt-sm tnt-muted" style={{ margin: 0 }}>
          The language pumped — but note carefully: that does <strong>not</strong> prove it regular. The lemma runs
          one way only.
        </p>
      ) : null}
    </div>
  )
}
