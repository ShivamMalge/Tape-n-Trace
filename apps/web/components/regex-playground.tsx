'use client'

/**
 * The regular-expression playground — four panels, one expression.
 *
 * Type an expression and watch its parse tree, its Thompson ε-NFA, its minimal
 * DFA and its language all move together. The four are derived by a single call
 * to `buildPlayground`, so they cannot disagree with each other: there is no
 * render in which the tree belongs to one expression and the machine to another.
 *
 * Typing is debounced. Half-typed expressions are unparseable by nature — `(0+`
 * is a state the student is passing through, not a mistake worth an error
 * message — so the panels wait a moment for them to stop.
 */

import { useMemo, useState } from 'react'
import { AutomatonRenderer, ParseTree } from '@tape-n-trace/ui'
import { MEMBERSHIP_LENGTH, buildPlayground } from '../lib/playground'
import { useDebounced } from '../lib/use-debounced'
import { SAMPLE_REGEXES } from '../lib/sample-inputs'

const ALPHABET = ['0', '1']

export function RegexPlayground(): React.JSX.Element {
  const [source, setSource] = useState('(0+1)*01')
  const settled = useDebounced(source, 220)

  const panels = useMemo(() => buildPlayground(settled, ALPHABET), [settled])
  const pending = settled !== source

  const accepted = panels.membership.filter((row) => row.accepted)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="tnt-card" style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 13 }} className="tnt-muted">
            Regular expression
          </span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={panels.errors.length > 0}
            aria-describedby="re-help"
            style={{
              fontFamily: 'var(--tnt-mono)',
              fontSize: 19,
              padding: '9px 11px',
              borderRadius: 'var(--tnt-radius)',
              border: `1px solid ${panels.errors.length > 0 ? 'var(--tnt-marked)' : 'var(--tnt-border)'}`,
              background: 'var(--tnt-bg)',
              color: 'var(--tnt-text)',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            Try:
          </span>
          {SAMPLE_REGEXES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setSource(sample.source)}
              title={sample.note}
              style={chip}
            >
              {sample.source}
            </button>
          ))}
        </div>

        <p id="re-help" className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
          Union is <code>+</code> or <code>|</code>, star is <code>*</code>. Star binds tightest, then
          concatenation, then union — so <code>01*</code> is <code>0(1*)</code>, not <code>(01)*</code>.
        </p>

        {panels.errors.length > 0 ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--tnt-marked)' }}>
            {panels.errors[0]?.message}
          </p>
        ) : null}
      </section>

      {/* Everything below is one expression's worth of panels. When the input is
          mid-edit they hold the last good expression rather than flickering. */}
      <div
        aria-busy={pending}
        style={{ display: 'grid', gap: 16, opacity: pending ? 0.55 : 1, transition: 'opacity 120ms ease' }}
      >
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Panel title="Parse tree" note="How the expression is read — this is the precedence, drawn.">
            {panels.tree.length === 0 ? (
              <Empty />
            ) : (
              <ParseTree nodes={panels.tree} />
            )}
          </Panel>

          <Panel
            title="Thompson ε-NFA"
            note={
              panels.enfa === null
                ? 'One fragment per node of the tree.'
                : `${panels.enfa.states.length} states, ${panels.enfa.transitions.length} transitions.`
            }
          >
            {panels.enfa === null ? <Empty /> : <AutomatonRenderer machine={panels.enfa} instanceId="pg-enfa" />}
          </Panel>
        </div>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Panel
            title="Minimal DFA"
            note={
              panels.dfa === null
                ? 'The same language, determinised and minimised.'
                : `${panels.dfa.states.length} states — no smaller DFA accepts this language.`
            }
          >
            {panels.dfa === null ? <Empty /> : <AutomatonRenderer machine={panels.dfa} instanceId="pg-dfa" />}
          </Panel>

          <Panel
            title="The language"
            note={`Every string up to length ${MEMBERSHIP_LENGTH}: ${accepted.length} of ${panels.membership.length} accepted.`}
          >
            {panels.membership.length === 0 ? (
              <Empty />
            ) : (
              <ul
                aria-label="Strings and whether they are accepted"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {panels.membership.map((row) => (
                  <li
                    key={row.word}
                    data-accepted={row.accepted}
                    title={row.accepted ? 'accepted' : 'rejected'}
                    style={{
                      fontFamily: 'var(--tnt-mono)',
                      fontSize: 13,
                      padding: '2px 8px',
                      borderRadius: 'var(--tnt-radius)',
                      border: `1px solid ${row.accepted ? 'var(--tnt-accepting)' : 'var(--tnt-border)'}`,
                      background: row.accepted ? 'var(--tnt-accepting-soft)' : 'var(--tnt-bg)',
                      color: row.accepted ? 'var(--tnt-accepting)' : 'var(--tnt-text-muted)',
                    }}
                  >
                    {row.word}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <h2 style={{ fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</h2>
      <p className="tnt-muted" style={{ margin: 0, fontSize: 12 }}>
        {note}
      </p>
      <div
        className="tnt-card"
        style={{ background: 'var(--tnt-bg)', minWidth: 0, overflowX: 'auto', minHeight: 140 }}
      >
        {children}
      </div>
    </section>
  )
}

function Empty(): React.JSX.Element {
  return (
    <p className="tnt-muted" style={{ fontSize: 13, margin: 0 }}>
      Nothing to show until the expression parses.
    </p>
  )
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
