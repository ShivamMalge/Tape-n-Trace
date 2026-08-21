/**
 * Parsing a grammar as a student types it — phases.md P1.3.
 *
 * Input is the notation the question bank itself uses:
 *
 *     S -> aSb | SS | ε
 *     E -> E + T | T
 *
 * Two tokenising conventions, decided once for the whole grammar: if any
 * alternative anywhere contains an internal space, the grammar is
 * **space-separated** (so `id` stays one terminal, even in an alternative of
 * its own); otherwise every alternative splits into single characters (so
 * `aSb` is a, S, b — the bank's own style). Deciding per alternative would
 * split the lone `id` in `F -> ( E ) | id`, which is exactly the surprise a
 * convention exists to prevent. A prime sticks to the symbol before it, so
 * `E'` is one variable.
 *
 * Variables are the symbols that appear as the head of some production;
 * everything else is a terminal. Both are inferred, and the start symbol is the
 * first head — all overridable by the caller.
 *
 * Errors carry a character position into the source and are all reported at
 * once (§4): a grammar with three problems shows three underlines, not one.
 */

import { err, ok, type Result, type ValidationError } from '../result.js'
import type { CFG, Production, Sym } from '../types.js'

export const EPSILON_TOKENS = new Set(['ε', 'eps', 'epsilon', 'λ'])

export interface ParseGrammarOptions {
  /** Override the inferred start symbol. */
  start?: string
}

interface RawProduction {
  head: string
  body: string[]
  /** Character offset of the alternative in the source, for error arrows. */
  position: number
}

/** Parse grammar text into a CFG, or every problem with it. */
export function parseGrammar(source: string, options: ParseGrammarOptions = {}): Result<CFG> {
  const errors: ValidationError[] = []
  const raw: RawProduction[] = []

  // One convention for the whole grammar — see the module note.
  const spaced = source.split('\n').some((line) => {
      const arrow = line.match(/->|→/)
      if (arrow === null || arrow.index === undefined) return false
    return line
      .slice(arrow.index + arrow[0].length)
      .split('|')
      .some((alternative) => /\S\s+\S/.test(alternative.trim()))
  })

  let offset = 0
  for (const line of source.split('\n')) {
    const lineStart = offset
    offset += line.length + 1
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const arrowMatch = line.match(/->|→/)
    if (arrowMatch === null || arrowMatch.index === undefined) {
      errors.push(
        problem('GRAMMAR_NO_ARROW', `This line has no arrow. Write productions as "S -> aSb | ε".`, lineStart),
      )
      continue
    }

    const headText = line.slice(0, arrowMatch.index).trim()
    const headTokens = tokenise(headText)
    if (headTokens.length !== 1) {
      errors.push(
        problem(
          'GRAMMAR_BAD_HEAD',
          headTokens.length === 0
            ? 'The production has no head. A variable must stand before the arrow.'
            : `The head must be a single variable, but "${headText}" is ${headTokens.length} symbols.`,
          lineStart,
        ),
      )
      continue
    }
    const head = headTokens[0] as string

    const bodyStart = lineStart + arrowMatch.index + arrowMatch[0].length
    const bodyText = line.slice(arrowMatch.index + arrowMatch[0].length)

    let altOffset = 0
    for (const alternative of bodyText.split('|')) {
      const position = bodyStart + altOffset
      altOffset += alternative.length + 1

      const trimmedAlt = alternative.trim()
      if (trimmedAlt === '') {
        errors.push(
          problem(
            'GRAMMAR_EMPTY_ALTERNATIVE',
            'An alternative is empty. Write ε explicitly for the empty production — a blank is too easy to write by accident.',
            position,
          ),
        )
        continue
      }

      if (EPSILON_TOKENS.has(trimmedAlt)) {
        raw.push({ head, body: [], position })
        continue
      }

      raw.push({ head, body: tokenise(trimmedAlt, spaced), position })
    }
  }

  if (raw.length === 0 && errors.length === 0) {
    errors.push(problem('GRAMMAR_EMPTY', 'The grammar has no productions.', 0))
  }
  if (errors.length > 0) return err(errors)

  const variables = [...new Set(raw.map((p) => p.head))]
  const variableSet = new Set(variables)
  const terminals = [
    ...new Set(raw.flatMap((p) => p.body).filter((symbol) => !variableSet.has(symbol))),
  ]

  const start = options.start ?? (raw[0]?.head as string)
  if (!variableSet.has(start)) {
    return err([
      problem('GRAMMAR_BAD_START', `The start symbol "${start}" is not the head of any production.`, 0),
    ])
  }

  const productions: Production[] = raw.map(({ head, body }) => ({ head, body }))
  return ok({ variables, terminals, productions, start })
}

/**
 * Tokenise one alternative.
 *
 * `spaced` selects the grammar-wide convention; when omitted it is judged from
 * this string alone (used for heads, which are single symbols either way).
 * Spaced: each run of non-space characters is one token. Otherwise: one
 * character per token, except that a `'` attaches to the symbol before it
 * (so E' — and E'' — stay single symbols, matching how primed variables are
 * written by hand).
 */
export function tokenise(text: string, spaced?: boolean): string[] {
  const trimmed = text.trim()
  if (trimmed === '') return []

  if (spaced ?? /\s/.test(trimmed)) {
    return trimmed.split(/\s+/)
  }

  const tokens: string[] = []
  for (const char of trimmed) {
    if (char === "'" && tokens.length > 0) {
      tokens[tokens.length - 1] += "'"
    } else {
      tokens.push(char)
    }
  }
  return tokens
}

/** The grammar written back out, one head per line, ε for empty bodies. */
export function grammarToText(grammar: CFG): string {
  return grammar.variables
    .map((variable) => {
      const bodies = grammar.productions
        .filter((p) => p.head === variable)
        .map((p) => (p.body.length === 0 ? 'ε' : p.body.join(' ')))
      return bodies.length === 0 ? null : `${variable} -> ${bodies.join(' | ')}`
    })
    .filter((line): line is string => line !== null)
    .join('\n')
}

/** One production as it is written on paper. */
export function productionToText(production: Production): string {
  return `${production.head} → ${production.body.length === 0 ? 'ε' : production.body.join(' ')}`
}

function problem(code: string, message: string, position: number): ValidationError {
  return { code, message, subject: { kind: 'production' }, position }
}

export type { Sym }
