/**
 * Derivations — Hopcroft 2e §5.1.3–5.1.4.
 *
 * Two things live here: the bounded search that *finds* a derivation of a
 * target string, and the trace that replays what it found — sentential form as
 * a token strip, applied production highlighted, and the parse tree growing one
 * node per step, so the §5.2 correspondence is watched rather than asserted.
 *
 * The search is honest about its bounds (§2.6): failing to find a derivation
 * within them is reported as exactly that, never as "the string is not in the
 * language".
 */

import { TraceBuilder, LIMITS } from '../trace.js'
import { err, ok, validationError, type Result } from '../result.js'
import { productionToText } from './parse.js'
import { applyToTree, startTree, treeYield, type CfgTreeNode, type TreeBuilder } from './parseTree.js'
import type { CFG, Highlight, Production, Step, Trace } from '../types.js'

export type DerivationMode = 'leftmost' | 'rightmost'

export interface DeriveSnapshot {
  grammar: CFG
  /** The sentential form, as the token strip the renderer draws. */
  input: string[]
  nodes: CfgTreeNode[]
  /** The production applied this step, as an index into grammar.productions. */
  applied: number | null
  mode: DerivationMode
  status: 'running' | 'done'
  [key: string]: unknown
}

/** One application: which production, at which position of the current form. */
export interface DerivationStep {
  production: number
  position: number
}

/** How far the search is allowed to go, and how far it actually went. */
export interface SearchBounds {
  maxDepth: number
  maxStates: number
  statesExplored: number
}

/**
 * The smallest number of terminals each variable can eventually yield —
 * the pruning bound that keeps the search from chasing sentential forms that
 * are already longer than the target could ever be.
 */
export function minYields(grammar: CFG): Map<string, number> {
  const min = new Map<string, number>(grammar.variables.map((v) => [v, Number.POSITIVE_INFINITY]))

  for (let changed = true; changed; ) {
    changed = false
    for (const production of grammar.productions) {
      let total = 0
      for (const symbol of production.body) {
        total += min.get(symbol) ?? 1 // a terminal contributes exactly itself
      }
      if (total < (min.get(production.head) as number)) {
        min.set(production.head, total)
        changed = true
      }
    }
  }
  return min
}

/**
 * Find a derivation of `target`, leftmost or rightmost, within bounds.
 *
 * Depth-first over sentential forms, expanding only the leftmost (or rightmost)
 * variable — which is what makes the found sequence a leftmost (rightmost)
 * derivation by construction. Pruning: the terminal prefix (suffix) must match
 * the target, and the guaranteed minimum yield must not exceed its length.
 */
export function findDerivation(
  grammar: CFG,
  target: readonly string[],
  mode: DerivationMode,
  maxStates = 20_000,
): { steps: DerivationStep[]; bounds: SearchBounds } | { steps: null; bounds: SearchBounds } {
  const variables = new Set(grammar.variables)
  const min = minYields(grammar)
  const bounds: SearchBounds = { maxDepth: LIMITS.SEARCH_DEPTH, maxStates, statesExplored: 0 }

  const productionsOf = new Map<string, { production: Production; index: number }[]>()
  grammar.productions.forEach((production, index) => {
    const list = productionsOf.get(production.head) ?? []
    list.push({ production, index })
    productionsOf.set(production.head, list)
  })

  const minimumLength = (sentential: readonly string[]): number =>
    sentential.reduce((sum, symbol) => sum + (variables.has(symbol) ? (min.get(symbol) ?? 1) : 1), 0)

  const prefixMatches = (sentential: readonly string[]): boolean => {
    if (mode === 'leftmost') {
      for (let i = 0; i < sentential.length; i++) {
        const symbol = sentential[i] as string
        if (variables.has(symbol)) return true
        if (symbol !== target[i]) return false
      }
      return sentential.length === target.length
    }
    for (let i = 0; i < sentential.length; i++) {
      const symbol = sentential[sentential.length - 1 - i] as string
      if (variables.has(symbol)) return true
      if (symbol !== target[target.length - 1 - i]) return false
    }
    return sentential.length === target.length
  }

  const search = (
    sentential: string[],
    depth: number,
    path: DerivationStep[],
  ): DerivationStep[] | null => {
    if (bounds.statesExplored >= maxStates || depth > bounds.maxDepth) return null
    bounds.statesExplored += 1

    const positions = sentential.flatMap((symbol, i) => (variables.has(symbol) ? [i] : []))
    if (positions.length === 0) {
      return sentential.length === target.length && sentential.every((s, i) => s === target[i])
        ? path
        : null
    }

    const position = mode === 'leftmost' ? (positions[0] as number) : (positions.at(-1) as number)
    const head = sentential[position] as string

    for (const { production, index } of productionsOf.get(head) ?? []) {
      const next = [
        ...sentential.slice(0, position),
        ...production.body,
        ...sentential.slice(position + 1),
      ]
      if (minimumLength(next) > target.length) continue
      if (!prefixMatches(next)) continue

      const found = search(next, depth + 1, [...path, { production: index, position }])
      if (found !== null) return found
    }
    return null
  }

  const found = search([grammar.start], 0, [])
  return found === null ? { steps: null, bounds } : { steps: found, bounds }
}

/**
 * Derive a string and trace the derivation, tree and all.
 *
 * A search that finds nothing returns an `incomplete`-style verdict carrying
 * its bounds — the string may well be in the language; the search simply did
 * not find a derivation within them.
 */
export function deriveString(
  grammar: CFG,
  target: readonly string[],
  mode: DerivationMode = 'leftmost',
): Result<Trace<Step<DeriveSnapshot>>> {
  const unknown = target.filter(
    (symbol) => !grammar.terminals.includes(symbol) && !grammar.variables.includes(symbol),
  )
  if (unknown.length > 0) {
    return err(
      [...new Set(unknown)].map((symbol) =>
        validationError(
          'DERIVE_UNKNOWN_SYMBOL',
          `The target contains "${symbol}", which is not a terminal of this grammar.`,
          { kind: 'machine' },
        ),
      ),
    )
  }

  const outcome = findDerivation(grammar, target, mode)
  const builder = new TraceBuilder<DeriveSnapshot>('grammar.derive', {
    grammar,
    target: [...target],
    mode,
  })

  const shown = target.length === 0 ? 'the empty string' : target.join('')
  let tree: TreeBuilder = startTree(grammar.start)

  builder.step({
    narration: `Derive ${shown} from ${grammar.start}, expanding the ${mode} variable at every step.`,
    highlight: [],
    snapshot: snapshotOf(grammar, tree, null, mode, 'running'),
  })

  if (outcome.steps === null) {
    builder.truncate(
      `No ${mode} derivation was found within ${outcome.bounds.maxDepth} steps and ${outcome.bounds.maxStates} explored forms. That is a bound, not a verdict — the string may still be in the language.`,
      outcome.bounds.maxStates,
    )
    return ok(
      builder.build({
        type: 'incomplete',
        reason: `No ${mode} derivation of ${shown} was found within the search bounds.`,
        bounded: { searchedUpTo: outcome.bounds.statesExplored, unit: 'steps' },
      }),
    )
  }

  for (const { production: index, position } of outcome.steps) {
    const production = grammar.productions[index] as Production
    tree = applyToTree(tree, production, position)
    builder.bump('productionsApplied')

    const bodySpan: Highlight[] =
      production.body.length === 0
        ? []
        : production.body.map((_, k) => ({
            type: 'input' as const,
            position: position + k,
            role: 'read' as const,
          }))

    builder.step({
      narration: `Apply ${productionToText(production)} to the ${mode} variable: the form is now ${tree.sentential.length === 0 ? 'the empty string' : tree.sentential.join(' ')}.`,
      citation: '5.1.4',
      highlight: [{ type: 'production', index, role: 'applied' }, ...bodySpan],
      snapshot: snapshotOf(grammar, tree, index, mode, 'running'),
    })
  }

  const derived = treeYield(tree.nodes)
  builder.step({
    narration: `Every variable is expanded: the ${mode} derivation reaches ${shown} in ${outcome.steps.length} steps, and the parse tree's yield reads the same string off its leaves.`,
    citation: '5.2.3',
    highlight: derived.map((_, i) => ({ type: 'input' as const, position: i, role: 'consumed' as const })),
    snapshot: snapshotOf(grammar, tree, null, mode, 'done'),
  })

  return ok(builder.build({ type: 'value', value: { derived: true, steps: outcome.steps.length } }))
}

function snapshotOf(
  grammar: CFG,
  tree: TreeBuilder,
  applied: number | null,
  mode: DerivationMode,
  status: 'running' | 'done',
): DeriveSnapshot {
  return { grammar, input: [...tree.sentential], nodes: tree.nodes, applied, mode, status }
}

/**
 * Every terminal string the grammar generates, up to a length — by bounded
 * leftmost search. Used to compare languages on a sample; the caps make it a
 * sample, and callers must present it as one.
 */
export function generatedStrings(
  grammar: CFG,
  maxLength: number,
  maxStates = 30_000,
): Set<string> {
  const variables = new Set(grammar.variables)
  const min = minYields(grammar)
  const found = new Set<string>()
  const seen = new Set<string>()
  let explored = 0

  const minimumLength = (sentential: readonly string[]): number =>
    sentential.reduce((sum, symbol) => sum + (variables.has(symbol) ? (min.get(symbol) ?? 1) : 1), 0)

  const queue: string[][] = [[grammar.start]]
  while (queue.length > 0 && explored < maxStates) {
    const sentential = queue.shift() as string[]
    const key = sentential.join('\u0000')
    if (seen.has(key)) continue
    seen.add(key)
    explored += 1

    const position = sentential.findIndex((symbol) => variables.has(symbol))
    if (position === -1) {
      if (sentential.length <= maxLength) found.add(sentential.join(''))
      continue
    }

    const head = sentential[position] as string
    for (const production of grammar.productions) {
      if (production.head !== head) continue
      const next = [
        ...sentential.slice(0, position),
        ...production.body,
        ...sentential.slice(position + 1),
      ]
      if (minimumLength(next) > maxLength) continue
      queue.push(next)
    }
  }

  return found
}
