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
    <div className="tnt-stack">
      <section className="tnt-card tnt-stack">
        <label className="tnt-field">
          <span className="tnt-muted">Regular expression</span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={panels.errors.length > 0}
            aria-describedby="re-help"
            className="tnt-input tnt-input-mono"
            style={{
              fontSize: 'var(--tnt-text-lg)',
              padding: 'var(--tnt-space-2) var(--tnt-space-3)',
              borderColor: panels.errors.length > 0 ? 'var(--tnt-marked)' : undefined,
            }}
          />
        </label>

        <div className="tnt-row tnt-row-tight">
          <span className="tnt-sm tnt-muted">Try:</span>
          {SAMPLE_REGEXES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="tnt-chip tnt-mono"
              onClick={() => setSource(sample.source)}
              title={sample.note}
            >
              {sample.source}
            </button>
          ))}
        </div>

        <p id="re-help" className="tnt-meta" style={{ margin: 0 }}>
          Union is <code>+</code> or <code>|</code>, star is <code>*</code>. Star binds tightest, then
          concatenation, then union — so <code>01*</code> is <code>0(1*)</code>, not <code>(01)*</code>.
        </p>

        {panels.errors.length > 0 ? (
          <p role="alert" className="tnt-sm" style={{ margin: 0, color: 'var(--tnt-marked)' }}>
            {panels.errors[0]?.message}
          </p>
        ) : null}
      </section>

      {/* Everything below is one expression's worth of panels. When the input is
          mid-edit they hold the last good expression rather than flickering. */}
      <div
        aria-busy={pending}
        className="tnt-stack"
        style={{ opacity: pending ? 0.55 : 1, transition: 'opacity 120ms ease' }}
      >
        <div className="tnt-panels">
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

        <div className="tnt-panels">
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
                className="tnt-row tnt-row-tight"
                style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflowY: 'auto' }}
              >
                {panels.membership.map((row) => (
                  <li
                    key={row.word}
                    data-accepted={row.accepted}
                    title={row.accepted ? 'accepted' : 'rejected'}
                    className="tnt-mono tnt-sm"
                    style={{
                      padding: '2px var(--tnt-space-2)',
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
    <section className="tnt-stack-sm">
      <h2 className="tnt-label" style={{ margin: 0 }}>
        {title}
      </h2>
      <p className="tnt-meta" style={{ margin: 0 }}>
        {note}
      </p>
      <div
        className="tnt-card tnt-scroll-x"
        style={{ background: 'var(--tnt-bg)', minWidth: 0, minHeight: 140 }}
      >
        {children}
      </div>
    </section>
  )
}

function Empty(): React.JSX.Element {
  return (
    <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
      Nothing to show until the expression parses.
    </p>
  )
}
