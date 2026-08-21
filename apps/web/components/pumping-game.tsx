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
    <div style={{ display: 'grid', gap: 14 }}>
      {/* The conversation so far — every move, in the engine's own words. */}
      <section className="tnt-card" style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
        {session.events.map((event, i) => (
          <p
            key={i}
            style={{
              margin: 0,
              fontSize: 14,
              opacity: i === session.events.length - 1 ? 1 : 0.65,
            }}
          >
            {event.narration}
          </p>
        ))}
      </section>

      {session.split !== null && (session.phase === 'pick-i' || over) ? (
        <Segments x={session.split.x} y={session.split.y} z={session.split.z} />
      ) : null}

      {error === null ? null : (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--tnt-marked)' }}>
          {error}
        </p>
      )}

      {session.phase === 'pick-w' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            play({ type: 'choose-w', w: wInput })
          }}
          style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="tnt-muted" style={{ fontSize: 13 }}>
              Your string w ∈ L, |w| ≥ {session.n}
            </span>
            <input
              value={wInput}
              onChange={(e) => setWInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={language.suggestedW(session.n)}
              style={input}
            />
          </label>
          <button type="submit" style={primary}>
            Challenge
          </button>
          <button
            type="button"
            onClick={() => setWInput(language.suggestedW(session.n))}
            style={plain}
          >
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
          style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="tnt-muted" style={{ fontSize: 13 }}>
              Your claimed pumping length n (1–8)
            </span>
            <input
              type="number"
              min={1}
              max={8}
              value={nInput}
              onChange={(e) => setNInput(Number(e.target.value))}
              style={{ ...input, width: 90 }}
            />
          </label>
          <button type="submit" style={primary}>
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
          style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="tnt-muted" style={{ fontSize: 13 }}>
              Your i (0–12, and never 1)
            </span>
            <input
              type="number"
              min={0}
              max={12}
              value={iInput}
              onChange={(e) => setIInput(Number(e.target.value))}
              style={{ ...input, width: 90 }}
            />
          </label>
          <button type="submit" style={primary}>
            Pump
          </button>
          <button type="button" onClick={() => play({ type: 'concede' })} style={plain}>
            Concede
          </button>
        </form>
      ) : null}

      {over ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={restart} style={primary}>
            Play again
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                serialise(sessionTrace(language, session)),
                `pumping-${language.id}-${session.phase}.trace.json`,
                'application/json',
              )
            }
            style={plain}
            title="The whole session as a trace — the same format every simulation uses"
          >
            Download the session
          </button>
        </div>
      ) : null}

      {proof === null ? null : (
        <section className="tnt-card" style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>The proof, written out</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{proof}</p>
          <button
            type="button"
            onClick={() => downloadText(proof, `proof-${language.id}.txt`, 'text/plain')}
            style={{ ...plain, justifySelf: 'start' }}
          >
            Download as text
          </button>
        </section>
      )}

      {latest?.phase === 'won' && session.mode === 'defend' ? (
        <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
          The language pumped — but note carefully: that does <strong>not</strong> prove it regular.
          The lemma runs one way only.
        </p>
      ) : null}
    </div>
  )
}

const input: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 16,
  padding: '7px 9px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  minWidth: 220,
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

const plain: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  fontSize: 14,
  cursor: 'pointer',
}
