/**
 * Eliminating useless symbols — Hopcroft 2e §7.1.1–7.1.2.
 *
 * A symbol is useful iff it appears in some derivation S ⇒* αXβ ⇒* w: it must
 * be **generating** (derives some terminal string) and **reachable** (appears
 * in something S derives). Theorem 7.2 fixes the order: drop the
 * non-generating symbols first, the unreachable second. The other way round is
 * Example 7.1's trap — `wrongOrderUseless` runs it deliberately, because the
 * residual useless symbol it leaves behind is the whole lesson.
 */

import { TraceBuilder } from '../trace.js'
import { err, ok, validationError, type Result } from '../result.js'
import { productionToText } from './parse.js'
import type { CFG, Production, Step, Trace } from '../types.js'

export interface UselessSnapshot {
  grammar: CFG
  generating: string[]
  reachable: string[]
  status: 'running' | 'done'
  [key: string]: unknown
}

export type UselessTrace = Trace<Step<UselessSnapshot>>

/** The generating symbols — §7.1.2's induction. Every terminal is generating. */
export function generatingSymbols(grammar: CFG): Set<string> {
  const generating = new Set<string>(grammar.terminals)
  let changed = true
  while (changed) {
    changed = false
    for (const p of grammar.productions) {
      if (generating.has(p.head)) continue
      if (p.body.every((symbol) => generating.has(symbol))) {
        generating.add(p.head)
        changed = true
      }
    }
  }
  return generating
}

/** The reachable symbols — §7.1.2's second induction, from S. */
export function reachableSymbols(grammar: CFG): Set<string> {
  const reachable = new Set<string>([grammar.start])
  let changed = true
  while (changed) {
    changed = false
    for (const p of grammar.productions) {
      if (!reachable.has(p.head)) continue
      for (const symbol of p.body) {
        if (!reachable.has(symbol)) {
          reachable.add(symbol)
          changed = true
        }
      }
    }
  }
  return reachable
}

function restrictedTo(grammar: CFG, keep: ReadonlySet<string>): CFG {
  return {
    variables: grammar.variables.filter((v) => keep.has(v)),
    terminals: grammar.terminals.filter((t) => keep.has(t)),
    productions: grammar.productions.filter(
      (p) => keep.has(p.head) && p.body.every((symbol) => keep.has(symbol)),
    ),
    start: grammar.start,
  }
}

/** Fixpoint rounds, kept for narration: which symbols joined in each round, and why. */
function generatingRounds(grammar: CFG): { symbol: string; via: number }[][] {
  const generating = new Set<string>(grammar.terminals)
  const rounds: { symbol: string; via: number }[][] = []
  let changed = true
  while (changed) {
    changed = false
    const round: { symbol: string; via: number }[] = []
    grammar.productions.forEach((p, index) => {
      if (generating.has(p.head)) return
      if (round.some((r) => r.symbol === p.head)) return
      if (p.body.every((symbol) => generating.has(symbol))) {
        round.push({ symbol: p.head, via: index })
      }
    })
    for (const r of round) generating.add(r.symbol)
    if (round.length > 0) {
      rounds.push(round)
      changed = true
    }
  }
  return rounds
}

function reachableRounds(grammar: CFG): { symbol: string; via: number }[][] {
  const reachable = new Set<string>([grammar.start])
  const rounds: { symbol: string; via: number }[][] = []
  let changed = true
  while (changed) {
    changed = false
    const round: { symbol: string; via: number }[] = []
    grammar.productions.forEach((p, index) => {
      if (!reachable.has(p.head)) return
      for (const symbol of p.body) {
        if (!reachable.has(symbol) && !round.some((r) => r.symbol === symbol)) {
          round.push({ symbol, via: index })
        }
      }
    })
    for (const r of round) reachable.add(r.symbol)
    if (round.length > 0) {
      rounds.push(round)
      changed = true
    }
  }
  return rounds
}

const setText = (symbols: Iterable<string>): string => `{${[...symbols].join(', ')}}`

/**
 * Remove every useless symbol, in Theorem 7.2's order: non-generating first,
 * then unreachable. Refused when S itself is not generating — then L(G) = ∅,
 * and the theorem's precondition (the grammar generates at least one string)
 * fails; there is nothing useful to keep.
 */
export function eliminateUseless(grammar: CFG): Result<UselessTrace> {
  const builder = new TraceBuilder<UselessSnapshot>('grammar.useless', { grammar })

  const genRounds = generatingRounds(grammar)
  const generating = new Set<string>(grammar.terminals)
  for (const round of genRounds) for (const r of round) generating.add(r.symbol)

  if (!generating.has(grammar.start)) {
    return err([
      validationError(
        'GRAMMAR_EMPTY_LANGUAGE',
        `The start symbol ${grammar.start} is not generating, so L(G) is empty. Theorem 7.2 assumes the grammar generates at least one string; with an empty language there are no useful symbols to keep.`,
        { kind: 'production' },
      ),
    ])
  }

  const snap = (generatingNow: Iterable<string>, reachableNow: Iterable<string>, g: CFG, status: 'running' | 'done'): UselessSnapshot => ({
    grammar: g,
    generating: [...generatingNow],
    reachable: [...reachableNow],
    status,
  })

  builder.step({
    narration: `Every terminal is generating — it derives itself in zero steps. The generating set starts as ${setText(grammar.terminals)}.`,
    citation: '7.1.2, Thm 7.4',
    highlight: [{ type: 'symbolSet', ids: [...grammar.terminals], role: 'generating' }],
    snapshot: snap(grammar.terminals, [], grammar, 'running'),
  })

  const genSoFar = new Set<string>(grammar.terminals)
  for (const round of genRounds) {
    for (const r of round) genSoFar.add(r.symbol)
    builder.step({
      narration: `${round.map((r) => `${r.symbol} is generating because ${productionToText(grammar.productions[r.via] as Production)} has an all-generating body`).join('; ')}. The set is now ${setText(genSoFar)}.`,
      citation: '7.1.2',
      highlight: [
        { type: 'symbolSet', ids: round.map((r) => r.symbol), role: 'generating' },
        ...round.map((r) => ({ type: 'production' as const, index: r.via, role: 'applied' as const })),
      ],
      snapshot: snap(genSoFar, [], grammar, 'running'),
    })
  }

  const nonGenerating = [...grammar.variables, ...grammar.terminals].filter((s) => !generating.has(s))
  const afterGenerating = restrictedTo(grammar, generating)

  const droppedFirst = grammar.productions.filter(
    (p) => !generating.has(p.head) || p.body.some((s) => !generating.has(s)),
  )
  builder.step({
    narration:
      nonGenerating.length === 0
        ? `Every symbol is generating, so the first pass removes nothing.`
        : `${setText(nonGenerating)} ${nonGenerating.length === 1 ? 'is' : 'are'} not generating. Removing ${nonGenerating.length === 1 ? 'it' : 'them'} takes ${droppedFirst.length === 1 ? 'one production' : `${droppedFirst.length} productions`} with ${nonGenerating.length === 1 ? 'it' : 'them'}: ${droppedFirst.map((p) => productionToText(p)).join('; ') || 'none'}.`,
    citation: '7.1.1, Thm 7.2',
    highlight: grammar.productions
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => !generating.has(p.head) || p.body.some((s) => !generating.has(s)))
      .map(({ index }) => ({ type: 'production' as const, index, role: 'removed' as const })),
    snapshot: snap(generating, [], grammar, 'running'),
  })

  const reachRounds = reachableRounds(afterGenerating)
  const reachable = new Set<string>([grammar.start])
  for (const round of reachRounds) for (const r of round) reachable.add(r.symbol)

  builder.step({
    narration: `On what remains, compute reachability from ${grammar.start}: the start symbol is reachable by definition.`,
    citation: '7.1.2, Thm 7.6',
    highlight: [{ type: 'symbolSet', ids: [grammar.start], role: 'reachable' }],
    snapshot: snap(generating, [grammar.start], afterGenerating, 'running'),
  })

  const reachSoFar = new Set<string>([grammar.start])
  for (const round of reachRounds) {
    for (const r of round) reachSoFar.add(r.symbol)
    builder.step({
      narration: `${round.map((r) => `${r.symbol} is reachable through ${productionToText(afterGenerating.productions[r.via] as Production)}`).join('; ')}. The reachable set is now ${setText(reachSoFar)}.`,
      citation: '7.1.2',
      highlight: [
        { type: 'symbolSet', ids: round.map((r) => r.symbol), role: 'reachable' },
        ...round.map((r) => ({ type: 'production' as const, index: r.via, role: 'applied' as const })),
      ],
      snapshot: snap(generating, reachSoFar, afterGenerating, 'running'),
    })
  }

  const result = restrictedTo(afterGenerating, reachable)
  const unreachable = [...afterGenerating.variables, ...afterGenerating.terminals].filter((s) => !reachable.has(s))

  builder.step({
    narration:
      unreachable.length === 0
        ? `Everything left is reachable. The grammar has no useless symbols, and its language is unchanged (Theorem 7.2).`
        : `${setText(unreachable)} ${unreachable.length === 1 ? 'is' : 'are'} unreachable and dropped. Every remaining symbol is both generating and reachable — useful — and the language is unchanged (Theorem 7.2).`,
    citation: '7.1.1, Thm 7.2',
    highlight: [],
    snapshot: snap(generating, reachable, result, 'done'),
  })

  builder.bump('symbolsRemoved', nonGenerating.length + unreachable.length)
  return ok(builder.build({ type: 'grammar', grammar: result }))
}

/**
 * Example 7.1's trap, on purpose: reachability first, then generating. The
 * residual symbols are useless symbols the wrong order failed to remove — the
 * reason Theorem 7.2 orders the passes the other way.
 */
export function wrongOrderUseless(grammar: CFG): { grammar: CFG; residual: string[] } {
  const afterReachable = restrictedTo(grammar, reachableSymbols(grammar))
  const wrong = restrictedTo(afterReachable, generatingSymbols(afterReachable))

  const stillReachable = reachableSymbols(wrong)
  const useful = new Set([...generatingSymbols(wrong)].filter((s) => stillReachable.has(s)))
  const residual = [...wrong.variables, ...wrong.terminals].filter((s) => !useful.has(s))
  return { grammar: wrong, residual }
}
