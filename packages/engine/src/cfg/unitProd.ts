/**
 * Eliminating unit productions — Hopcroft 2e §7.1.4.
 *
 * "Expand until they disappear" fails on a cycle A → B → C → A, so the book
 * does it properly: find every **unit pair** (A, B) with A ⇒* B by unit
 * productions alone (basis (A, A); induction (A, B) and B → C give (A, C) —
 * Theorem 7.11), then give A every non-unit body B has, for every pair, and
 * throw the unit productions away (Theorem 7.13). Example 7.12's Fig. 7.1 is
 * the table this trace builds.
 */

import { TraceBuilder } from '../trace.js'
import { ok, type Result } from '../result.js'
import { productionToText } from './parse.js'
import type { CFG, Production, Step, Trace } from '../types.js'

export interface UnitSnapshot {
  grammar: CFG
  /** The unit pairs found so far, as [A, B]. */
  pairs: [string, string][]
  status: 'running' | 'done'
  [key: string]: unknown
}

export type UnitTrace = Trace<Step<UnitSnapshot>>

export function isUnitProduction(p: Production, grammar: CFG): boolean {
  return p.body.length === 1 && grammar.variables.includes(p.body[0] as string)
}

/** Every unit pair (A, B), basis first, then by rounds of the induction. */
export function unitPairs(grammar: CFG): [string, string][] {
  const pairs: [string, string][] = grammar.variables.map((v) => [v, v])
  const has = (a: string, b: string): boolean => pairs.some(([x, y]) => x === a && y === b)
  let changed = true
  while (changed) {
    changed = false
    for (const [a, b] of [...pairs]) {
      for (const p of grammar.productions) {
        if (p.head !== b || !isUnitProduction(p, grammar)) continue
        const c = p.body[0] as string
        if (!has(a, c)) {
          pairs.push([a, c])
          changed = true
        }
      }
    }
  }
  return pairs
}

const pairText = (a: string, b: string): string => `(${a}, ${b})`

export function eliminateUnit(grammar: CFG): Result<UnitTrace> {
  const builder = new TraceBuilder<UnitSnapshot>('grammar.unit-prod', { grammar })
  const snap = (g: CFG, pairs: [string, string][], status: 'running' | 'done'): UnitSnapshot => ({
    grammar: g,
    pairs,
    status,
  })

  const unitIndices = grammar.productions
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => isUnitProduction(p, grammar))
    .map(({ index }) => index)

  if (unitIndices.length === 0) {
    builder.step({
      narration: `The grammar has no unit production — no body is a single variable — so there is nothing to eliminate.`,
      citation: '7.1.4',
      highlight: [],
      snapshot: snap(grammar, grammar.variables.map((v) => [v, v]), 'done'),
    })
    return ok(builder.build({ type: 'grammar', grammar }))
  }

  // Basis.
  let pairs: [string, string][] = grammar.variables.map((v) => [v, v])
  builder.step({
    narration: `Basis: ${pairs.map(([a, b]) => pairText(a, b)).join(', ')} ${pairs.length === 1 ? 'is a unit pair' : 'are unit pairs'} — every variable reaches itself in zero steps.`,
    citation: '7.1.4, Thm 7.11',
    highlight: unitIndices.map((index) => ({ type: 'production' as const, index, role: 'unit' as const })),
    snapshot: snap(grammar, pairs, 'running'),
  })

  // Induction, by rounds, each new pair with the production that justified it.
  let changed = true
  while (changed) {
    changed = false
    const round: { pair: [string, string]; via: number; from: [string, string] }[] = []
    for (const [a, b] of pairs) {
      grammar.productions.forEach((p, index) => {
        if (p.head !== b || !isUnitProduction(p, grammar)) return
        const c = p.body[0] as string
        if (pairs.some(([x, y]) => x === a && y === c)) return
        if (round.some((r) => r.pair[0] === a && r.pair[1] === c)) return
        round.push({ pair: [a, c], via: index, from: [a, b] })
      })
    }
    if (round.length === 0) break
    changed = true
    pairs = [...pairs, ...round.map((r) => r.pair)]
    builder.step({
      narration: `${round
        .map((r) => `${pairText(...r.from)} and ${productionToText(grammar.productions[r.via] as Production)} give ${pairText(...r.pair)}`)
        .join('; ')}.`,
      citation: '7.1.4, Thm 7.11',
      highlight: round.map((r) => ({ type: 'production' as const, index: r.via, role: 'unit' as const })),
      snapshot: snap(grammar, pairs, 'running'),
    })
  }

  builder.step({
    narration: `No more pairs can be inferred: the ${pairs.length} unit pairs are ${pairs.map(([a, b]) => pairText(a, b)).join(', ')}. They stand for every derivation that uses nothing but unit productions.`,
    citation: '7.1.4, Thm 7.11',
    highlight: [],
    snapshot: snap(grammar, pairs, 'running'),
  })

  // Rewrite: for each pair (A, B), A gets every non-unit body of B.
  let built: Production[] = []
  let current: CFG = { ...grammar, productions: [] }
  for (const a of grammar.variables) {
    const additions: Production[] = []
    const sources: string[] = []
    for (const [x, b] of pairs) {
      if (x !== a) continue
      for (const p of grammar.productions) {
        if (p.head !== b || isUnitProduction(p, grammar)) continue
        if (additions.some((q) => q.body.join(' ') === p.body.join(' '))) continue
        if (built.some((q) => q.head === a && q.body.join(' ') === p.body.join(' '))) continue
        additions.push({ head: a, body: [...p.body] })
        if (!sources.includes(b)) sources.push(b)
      }
    }
    if (additions.length === 0) continue
    const firstIndex = built.length
    built = [...built, ...additions]
    current = { ...current, productions: built }
    builder.step({
      narration: `${a} takes every non-unit body of ${sources.map((b) => (b === a ? `its own` : b)).join(', ')}: ${a} → ${additions.map((p) => p.body.join(' ')).join(' | ')}.`,
      citation: '7.1.4, Thm 7.13',
      highlight: additions.map((_, i) => ({ type: 'production' as const, index: firstIndex + i, role: 'added' as const })),
      snapshot: snap(current, pairs, 'running'),
    })
  }

  const result: CFG = { ...grammar, productions: built }
  builder.step({
    narration: `The unit productions are gone and the language is unchanged (Theorem 7.13): every chain of unit steps followed by a non-unit step is now a single production.`,
    citation: '7.1.4, Thm 7.13',
    highlight: [],
    snapshot: snap(result, pairs, 'done'),
  })

  builder.bump('unitPairs', pairs.length)
  return ok(builder.build({ type: 'grammar', grammar: result }))
}
