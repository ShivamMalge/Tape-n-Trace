'use client'

/**
 * The grammar box every Module 3 page shares.
 *
 * Live-parsed with positioned errors: each problem underlines its own spot in
 * the source, and all of them show at once (§4). The two tokenising
 * conventions are stated under the box rather than left to be discovered.
 */

import { useEffect, useMemo, useState } from 'react'
import { isOk, parseGrammar, productionToText } from '@tape-n-trace/engine'
import type { CFG, ValidationError } from '@tape-n-trace/engine'
import { useDebounced } from '../lib/use-debounced'

export interface GrammarPreset {
  id: string
  title: string
  source: string
}

export const GRAMMAR_PRESETS: GrammarPreset[] = [
  { id: 'anbn', title: 'aⁿbⁿ', source: 'S -> aSb | ε' },
  { id: 'balanced', title: 'Balanced brackets', source: 'S -> (S)S | ε' },
  { id: 'ambiguous-expr', title: 'Ambiguous expressions', source: 'E -> E + E | E * E | ( E ) | id' },
  {
    id: 'expr',
    title: 'The exam expression grammar',
    source: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
  },
  { id: 'if-else', title: 'Dangling else (QB #38)', source: 'S -> iCtS | iCtSeS | a\nC -> b' },
  { id: 'wwr', title: 'Even palindromes wwᴿ', source: 'S -> aSa | bSb | ε' },
]

export interface GrammarInputProps {
  initial?: string
  onGrammar: (grammar: CFG | null, source: string) => void
  /** The preset chips to offer; the Module 3 grammars by default. */
  presets?: GrammarPreset[]
}

export function GrammarInput({ initial, onGrammar, presets = GRAMMAR_PRESETS }: GrammarInputProps): React.JSX.Element {
  const [source, setSource] = useState(initial ?? presets[0]?.source ?? '')
  const settled = useDebounced(source, 220)

  const outcome = useMemo(() => {
    const parsed = parseGrammar(settled)
    return isOk(parsed)
      ? { grammar: parsed.value, errors: [] as ValidationError[] }
      : { grammar: null, errors: parsed.errors }
  }, [settled])

  useEffect(() => {
    onGrammar(outcome.grammar, settled)
  }, [outcome, settled, onGrammar])

  return (
    <section className="tnt-card tnt-stack">
      <label className="tnt-field">
        <span className="tnt-muted">
          Grammar — one variable per line, alternatives with |, ε for the empty production
        </span>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={Math.max(3, source.split('\n').length + 1)}
          spellCheck={false}
          aria-invalid={outcome.errors.length > 0}
          className="tnt-input tnt-input-mono"
          style={{
            borderColor: outcome.errors.length > 0 ? 'var(--tnt-marked)' : undefined,
            resize: 'vertical',
          }}
        />
      </label>

      <div className="tnt-row tnt-row-tight">
        <span className="tnt-sm tnt-muted">
          Presets:
        </span>
        {presets.map((preset) => (
          <button key={preset.id} type="button" className="tnt-chip" onClick={() => setSource(preset.source)}>
            {preset.title}
          </button>
        ))}
      </div>

      <p className="tnt-meta" style={{ margin: 0 }}>
        Symbols split per character (<code className="tnt-code">aSb</code> is a, S, b) unless any alternative contains
        spaces — then tokens are space-separated and <code className="tnt-code">id</code> stays one terminal. Variables are
        whatever appears left of an arrow.
      </p>

      {outcome.errors.length > 0 ? (
        <ul role="alert" className="tnt-stack-sm" style={{ margin: 0, paddingLeft: 'var(--tnt-space-4)' }}>
          {outcome.errors.map((error, i) => (
            <li key={i} className="tnt-sm" style={{ color: 'var(--tnt-marked)' }}>
              {error.message}
              {error.position === undefined ? null : (
                <PositionNote source={settled} position={error.position} />
              )}
            </li>
          ))}
        </ul>
      ) : outcome.grammar === null ? null : (
        <p className="tnt-sm tnt-muted" style={{ margin: 0 }}>
          {outcome.grammar.variables.length} variables {`{${outcome.grammar.variables.join(', ')}}`},{' '}
          {outcome.grammar.terminals.length} terminals {`{${outcome.grammar.terminals.join(', ')}}`},{' '}
          start {outcome.grammar.start} — {outcome.grammar.productions.length} productions.
        </p>
      )}
    </section>
  )
}

function PositionNote({ source, position }: { source: string; position: number }): React.JSX.Element {
  const before = source.slice(0, position)
  const line = before.split('\n').length
  const column = position - before.lastIndexOf('\n')
  return (
    <span className="tnt-meta">
      {' '}
      (line {line}, column {column})
    </span>
  )
}

/** The productions listed, with one optionally lit — used by every stepper. */
export function ProductionList({
  grammar,
  litIndices,
}: {
  grammar: CFG
  litIndices: ReadonlySet<number>
}): React.JSX.Element {
  return (
    <ol className="tnt-mono tnt-stack-sm" style={{ margin: 0, paddingLeft: 'var(--tnt-space-5)' }}>
      {grammar.productions.map((production, index) => (
        <li
          key={index}
          data-lit={litIndices.has(index) ? 'true' : undefined}
          style={{
            padding: '1px var(--tnt-space-2)',
            borderRadius: 'var(--tnt-radius)',
            background: litIndices.has(index) ? 'var(--tnt-current-soft)' : undefined,
            color: litIndices.has(index) ? 'var(--tnt-current)' : undefined,
          }}
        >
          {productionToText(production)}
        </li>
      ))}
    </ol>
  )
}
