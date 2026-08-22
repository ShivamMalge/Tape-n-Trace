'use client'

/**
 * The PDA editor — transitions typed the way the book writes δ, drawn with
 * `a, X/YX` arc labels, checked for determinism pair by pair.
 *
 * δ(q0, a, Z0) = (q0, AZ0) is typed as `q0, a, Z0 -> q0, AZ0`. The graph,
 * the validation list, the DPDA report and the run panel all follow the text
 * as it settles.
 */

import { useMemo, useState } from 'react'
import { PDA_PRESETS, checkDeterminism, isOk, validatePDA } from '@tape-n-trace/engine'
import type { PDA } from '@tape-n-trace/engine'
import { AutomatonRenderer } from '@tape-n-trace/ui'
import { ValidationErrors } from './validation-errors'
import { PdaRunner } from './pda-runner'
import { parsePdaText, pdaToText } from '../lib/pda-text'
import { pdaEdgeLabel, pdaToDrawable } from '../lib/pda-drawable'
import { useDebounced } from '../lib/use-debounced'

const OPENING = PDA_PRESETS[0]

export function PdaEditor(): React.JSX.Element {
  const [source, setSource] = useState(OPENING === undefined ? '' : pdaToText(OPENING.machine))
  const [start, setStart] = useState(OPENING?.machine.start ?? 'q0')
  const [startStack, setStartStack] = useState(OPENING?.machine.startStack ?? 'Z0')
  const [acceptingText, setAcceptingText] = useState(OPENING?.machine.accepting.join(', ') ?? '')
  const [acceptBy, setAcceptBy] = useState<PDA['acceptBy']>(OPENING?.machine.acceptBy ?? 'finalState')

  const settled = useDebounced(source, 250)

  const outcome = useMemo(() => {
    const parsed = parsePdaText(settled, {
      start,
      startStack,
      accepting: acceptingText.split(','),
      acceptBy,
    })
    if (!isOk(parsed)) return { machine: null, errors: parsed.errors }
    const problems = validatePDA(parsed.value)
    return problems.length > 0 ? { machine: null, errors: problems } : { machine: parsed.value, errors: [] }
  }, [settled, start, startStack, acceptingText, acceptBy])

  const machine = outcome.machine
  const determinism = useMemo(() => (machine === null ? null : checkDeterminism(machine)), [machine])
  const labelOf = useMemo(() => {
    if (machine === null) return new Map<string, string>()
    return new Map(machine.transitions.map((t) => [t.id, `${t.from} —${pdaEdgeLabel(t)}→ ${t.to}`]))
  }, [machine])

  const loadPreset = (id: string): void => {
    const preset = PDA_PRESETS.find((p) => p.id === id)
    if (preset === undefined) return
    setSource(pdaToText(preset.machine))
    setStart(preset.machine.start)
    setStartStack(preset.machine.startStack)
    setAcceptingText(preset.machine.accepting.join(', '))
    setAcceptBy(preset.machine.acceptBy)
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          Start from:
        </span>
        {PDA_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => loadPreset(p.id)}
            style={{
              fontSize: 13,
              padding: '3px 10px',
              borderRadius: 999,
              border: '1px solid var(--tnt-border)',
              background: 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
              cursor: 'pointer',
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 13 }} className="tnt-muted">
          Transitions — one per line, <code>state, read, pop -&gt; state, push</code>. Use ε (or eps)
          to read nothing and to push nothing; a push without spaces splits as letter-plus-digits, so
          AZ0 pushes A then Z0.
        </span>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={Math.max(8, source.split('\n').length + 1)}
          spellCheck={false}
          style={{
            fontFamily: 'var(--tnt-mono)',
            fontSize: 14,
            lineHeight: 1.6,
            padding: '10px 12px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
            resize: 'vertical',
          }}
        />
      </label>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Start state
          </span>
          <input
            value={start}
            onChange={(event) => setStart(event.target.value)}
            style={fieldStyle}
            spellCheck={false}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Start stack symbol
          </span>
          <input
            value={startStack}
            onChange={(event) => setStartStack(event.target.value)}
            style={fieldStyle}
            spellCheck={false}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Accepting states (comma separated)
          </span>
          <input
            value={acceptingText}
            onChange={(event) => setAcceptingText(event.target.value)}
            style={{ ...fieldStyle, minWidth: 180 }}
            spellCheck={false}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Accept by
          </span>
          <select
            value={acceptBy}
            onChange={(event) => setAcceptBy(event.target.value as PDA['acceptBy'])}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          >
            <option value="finalState">final state — L(P)</option>
            <option value="emptyStack">empty stack — N(P)</option>
          </select>
        </label>
      </div>

      <ValidationErrors errors={outcome.errors} />

      {machine === null ? null : (
        <>
          <div className="tnt-card" style={{ background: 'var(--tnt-bg)' }}>
            <AutomatonRenderer machine={pdaToDrawable(machine)} step={null} instanceId="pda-edit" />
          </div>

          {determinism === null ? null : (
            <section aria-label="Determinism report" role="status">
              <h2 style={{ fontSize: 15 }}>Is it a DPDA?</h2>
              {determinism.deterministic ? (
                <p
                  className="tnt-card"
                  style={{ margin: 0, borderLeft: '3px solid var(--tnt-accepting)', fontSize: 14 }}
                >
                  Deterministic. No two moves ever apply to the same ID: for every state, input
                  symbol and stack top there is at most one move, and no ε-move competes with a
                  reading move (§6.4.1).
                </p>
              ) : (
                <div className="tnt-card" style={{ borderLeft: '3px solid var(--tnt-dead)', display: 'grid', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    Not deterministic — {determinism.violations.length} pair
                    {determinism.violations.length === 1 ? '' : 's'} of moves can fire on the same
                    ID:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                    {determinism.violations.map((violation) => (
                      <li key={`${violation.a}~${violation.b}`} style={{ fontSize: 13 }}>
                        <span style={{ fontFamily: 'var(--tnt-mono)' }}>
                          {labelOf.get(violation.a) ?? violation.a}
                        </span>{' '}
                        and{' '}
                        <span style={{ fontFamily: 'var(--tnt-mono)' }}>
                          {labelOf.get(violation.b) ?? violation.b}
                        </span>
                        <br />
                        <span className="tnt-muted">{violation.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section aria-label="Run it">
            <h2 style={{ fontSize: 15 }}>Run it</h2>
            <PdaRunner machine={machine} />
          </section>
        </>
      )}

      <section aria-label="Where DPDAs sit">
        <h2 style={{ fontSize: 15 }}>Where DPDAs sit (§6.4)</h2>
        <div className="tnt-card" style={{ fontSize: 14, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0 }}>
            Regular ⊊ DPDA languages ⊊ context-free — both inclusions are strict. Every regular
            language is a DPDA language (ignore the stack and run the DFA), but wcwᴿ is a DPDA
            language and not regular. And wwᴿ is context-free but no DPDA accepts it: without the
            centre mark there is nothing to tell the machine when to stop pushing and start
            matching, and a deterministic machine cannot guess.
          </p>
          <p style={{ margin: 0 }}>
            For DPDAs the two acceptance modes also stop agreeing: by final state a DPDA can accept
            a language with two strings where one is a prefix of the other, but by empty stack it
            cannot — once the stack is empty the machine is done, so no accepted string can be a
            proper prefix of another (§6.4.2–6.4.3).
          </p>
        </div>
      </section>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  fontFamily: 'var(--tnt-mono)',
  fontSize: 14,
  padding: '6px 9px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  minWidth: 90,
}
