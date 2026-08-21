'use client'

/**
 * The lexical analysis demo — Hopcroft 2e §3.3.2.
 *
 * Token rules as regular expressions, combined into one machine, then a snippet
 * tokenised by **longest match** with the winning rule named at each position.
 *
 * Longest match is the part worth showing. `iffy` is one identifier, not the
 * keyword `if` followed by `fy`, and the rule that resolves it — take the
 * longest match, and on a tie take the rule declared first — is exactly why real
 * lexers list keywords above identifiers.
 */

import { useMemo, useState } from 'react'
import { isOk, simulateDFA } from '@tape-n-trace/engine'
import type { FiniteAutomaton } from '@tape-n-trace/engine'
import { buildPlayground } from '../lib/playground'
import { useDebounced } from '../lib/use-debounced'

/**
 * Alphabet abstracted the way §3.3.2's examples are: `a` a letter, `d` a digit.
 * Real lexers work over ASCII; the shape of the machine is the same.
 */
const ALPHABET = ['a', 'd', ' ', '=', '+']

interface Rule {
  name: string
  regex: string
  note: string
}

const RULES: Rule[] = [
  { name: 'KEYWORD', regex: 'aa', note: 'A two-letter keyword, like "if".' },
  { name: 'IDENT', regex: 'a(a+d)*', note: 'A letter then letters or digits.' },
  { name: 'NUMBER', regex: 'dd*', note: 'One or more digits.' },
  { name: 'OP', regex: '=+ +', note: 'An operator: = or +.' },
  { name: 'SPACE', regex: '  *', note: 'Runs of spaces.' },
]

interface Token {
  rule: string
  text: string
  start: number
}

export function LexerDemo(): React.JSX.Element {
  const [source, setSource] = useState('add1 = ad + dd')
  const settled = useDebounced(source, 220)

  // One DFA per rule, built once. Longest match then means: at each position,
  // ask every machine how far it can get, and take the furthest.
  const machines = useMemo(
    () =>
      RULES.map((rule) => {
        const built = buildPlayground(rule.regex, ALPHABET)
        return { rule, dfa: built.dfa }
      }),
    [],
  )

  const tokens = useMemo(() => tokenise(settled, machines), [settled, machines])

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <caption className="tnt-muted" style={{ textAlign: 'left', fontSize: 12, paddingBottom: 6 }}>
          The rules, in order. On a tie the first one wins — which is why KEYWORD sits above IDENT.
        </caption>
        <thead>
          <tr>
            {['Rule', 'Expression', 'Matches'].map((h) => (
              <th key={h} scope="col" style={{ textAlign: 'left', padding: '4px 8px', fontSize: 12, color: 'var(--tnt-text-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RULES.map((rule) => (
            <tr key={rule.name} style={{ borderTop: '1px solid var(--tnt-border)' }}>
              <td style={{ padding: '4px 8px', fontFamily: 'var(--tnt-mono)' }}>{rule.name}</td>
              <td style={{ padding: '4px 8px', fontFamily: 'var(--tnt-mono)' }}>{rule.regex}</td>
              <td style={{ padding: '4px 8px' }} className="tnt-muted">
                {rule.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <label style={{ display: 'grid', gap: 5 }}>
        <span style={{ fontSize: 13 }} className="tnt-muted">
          Snippet — letters as <code>a</code>, digits as <code>d</code>, plus spaces, <code>=</code> and{' '}
          <code>+</code>
        </span>
        <input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          style={{
            fontFamily: 'var(--tnt-mono)',
            fontSize: 16,
            padding: '8px 10px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
          }}
        />
      </label>

      <div className="tnt-card" style={{ background: 'var(--tnt-bg)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tokens.length === 0 ? (
          <span className="tnt-muted" style={{ fontSize: 13 }}>
            Nothing tokenised yet.
          </span>
        ) : (
          tokens.map((token, i) => (
            <span
              key={`${token.start}-${i}`}
              data-rule={token.rule}
              style={{
                display: 'inline-grid',
                gap: 1,
                padding: '3px 8px',
                borderRadius: 'var(--tnt-radius)',
                border: `1px solid ${token.rule === 'ERROR' ? 'var(--tnt-marked)' : 'var(--tnt-border)'}`,
                background: token.rule === 'ERROR' ? 'var(--tnt-surface)' : 'var(--tnt-current-soft)',
              }}
            >
              <code style={{ fontSize: 14 }}>{token.text === ' ' ? '␣' : token.text}</code>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 0.5,
                  color: token.rule === 'ERROR' ? 'var(--tnt-marked)' : 'var(--tnt-current)',
                }}
              >
                {token.rule}
              </span>
            </span>
          ))
        )}
      </div>

      <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
        Try <code>aa</code> against <code>aaa</code>: the first is a KEYWORD, the second an IDENT, because
        longest match takes the three-letter reading before the two-letter one.
      </p>
    </div>
  )
}

/**
 * Longest match, first rule wins on a tie.
 *
 * At each position every rule's DFA is run over successively longer prefixes and
 * the furthest acceptance is kept. A position no rule matches produces one
 * ERROR character, so tokenising always terminates rather than sticking.
 */
function tokenise(text: string, machines: { rule: Rule; dfa: FiniteAutomaton | null }[]): Token[] {
  const characters = [...text]
  const tokens: Token[] = []
  let at = 0

  while (at < characters.length) {
    let best: { rule: string; length: number } | null = null

    for (const { rule, dfa } of machines) {
      if (dfa === null) continue
      for (let length = characters.length - at; length > 0; length--) {
        // Strictly longer than the best so far; equal length keeps the earlier
        // rule, which is the tie-break that puts keywords above identifiers.
        if (best !== null && length <= best.length) break
        const candidate = characters.slice(at, at + length)
        const run = simulateDFA(dfa, candidate)
        if (!isOk(run)) continue
        if (run.value.result.type === 'acceptance' && run.value.result.accepted) {
          best = { rule: rule.name, length }
          break
        }
      }
    }

    if (best === null) {
      tokens.push({ rule: 'ERROR', text: characters[at] ?? '', start: at })
      at += 1
    } else {
      tokens.push({ rule: best.rule, text: characters.slice(at, at + best.length).join(''), start: at })
      at += best.length
    }
  }

  return tokens
}
