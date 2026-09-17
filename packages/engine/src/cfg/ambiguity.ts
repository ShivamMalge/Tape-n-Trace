/**
 * Ambiguity — Hopcroft 2e §5.4.
 *
 * A grammar is ambiguous when some string has two distinct leftmost
 * derivations (§5.4.3 — leftmost derivations are the honest way to express it,
 * since distinct derivation *orders* of one tree prove nothing). The detector
 * searches for such a string within explicit bounds.
 *
 * The asymmetry in the answers is the point (§2.6): finding a witness proves
 * ambiguity outright; finding none proves nothing, and the result says "no
 * counterexample within bounds" and never "unambiguous". Inherent ambiguity is
 * undecidable, so no algorithm could do better — which the docs panel says
 * out loud.
 */

import { ok, type Result } from '../result.js'
import { minYields } from './derive.js'
import { applyToTree, startTree, type CfgTreeNode, type TreeBuilder } from './parseTree.js'
import type { BoundedClaim, CFG, Production } from '../types.js'

export interface AmbiguityWitness {
  ambiguous: true
  /** The string with two distinct leftmost derivations, as tokens. */
  witness: string[]
  /** The two derivations, as production-index sequences. */
  derivations: [number[], number[]]
  /** The two parse trees, for the side-by-side display. */
  trees: [CfgTreeNode[], CfgTreeNode[]]
  explored: number
}

export interface NoWitness {
  ambiguous: false
  /** Exactly what was searched, so "within bounds" means something. */
  bounded: BoundedClaim & { statesExplored: number; maxStates: number }
  /** The sentence the UI must show. Never claims unambiguity. */
  note: string
}

export type AmbiguityResult = AmbiguityWitness | NoWitness

const MAX_FORM_LENGTH = 10
const MAX_STATES = 30_000

/**
 * Search for a string with two distinct leftmost derivations.
 *
 * Breadth-first over leftmost sentential forms, each carrying the sequence of
 * production indices that produced it. Two different sequences arriving at the
 * same terminal string is ambiguity by definition, and BFS order means the
 * witness found is among the shortest.
 */
export function detectAmbiguity(grammar: CFG): Result<AmbiguityResult> {
  const variables = new Set(grammar.variables)
  const derivationsOf = new Map<string, number[]>()
  let explored = 0

  interface Form {
    sentential: string[]
    path: number[]
  }
  const queue: Form[] = [{ sentential: [grammar.start], path: [] }]

  while (queue.length > 0 && explored < MAX_STATES) {
    const { sentential, path } = queue.shift() as Form
    explored += 1

    const position = sentential.findIndex((symbol) => variables.has(symbol))
    if (position === -1) {
      const word = sentential.join('\u0000')
      const earlier = derivationsOf.get(word)
      if (earlier !== undefined && !samePath(earlier, path)) {
        return ok({
          ambiguous: true,
          witness: sentential,
          derivations: [earlier, path],
          trees: [replay(grammar, earlier), replay(grammar, path)],
          explored,
        })
      }
      if (earlier === undefined) derivationsOf.set(word, path)
      continue
    }

    const head = sentential[position] as string
    grammar.productions.forEach((production, index) => {
      if (production.head !== head) return
      const next = [
        ...sentential.slice(0, position),
        ...production.body,
        ...sentential.slice(position + 1),
      ]
      if (next.length > MAX_FORM_LENGTH) return
      queue.push({ sentential: next, path: [...path, index] })
    })
  }

  return ok({
    ambiguous: false,
    bounded: {
      searchedUpTo: MAX_FORM_LENGTH,
      unit: 'derivationDepth',
      statesExplored: explored,
      maxStates: MAX_STATES,
    },
    note: `No string with two distinct leftmost derivations was found within the bounds — sentential forms up to ${MAX_FORM_LENGTH} symbols, ${explored.toLocaleString('en')} forms explored. This is not a proof of unambiguity: inherent ambiguity is undecidable, so no bounded search can give one.`,
  })
}

/**
 * All distinct leftmost derivations of one specific string, up to a cap.
 * The targeted form of the detector, for "show me both derivations of this".
 */
export function leftmostDerivationsOf(
  grammar: CFG,
  target: readonly string[],
  cap = 2,
  maxStates = 30_000,
): number[][] {
  const variables = new Set(grammar.variables)
  const min = minYields(grammar)
  const found: number[][] = []
  let explored = 0

  // Breadth-first with an explicit queue. Recursing depth-first overflowed the
  // call stack on a unit cycle (S → S | a) before the state cap could fire, and
  // pruning on the form's length dropped every form whose extra symbols were
  // nullable — S → aSSS | ε has a derivation of a, which that prune never saw.
  const queue: { sentential: string[]; path: number[] }[] = [{ sentential: [grammar.start], path: [] }]
  for (let at = 0; at < queue.length; at++) {
    if (found.length >= cap || explored >= maxStates) break
    explored += 1
    const { sentential, path } = queue[at] as { sentential: string[]; path: number[] }
    queue[at] = { sentential: [], path: [] }

    const position = sentential.findIndex((symbol) => variables.has(symbol))
    if (position === -1) {
      if (sentential.length === target.length && sentential.every((s, i) => s === target[i])) {
        found.push(path)
      }
      continue
    }

    // Prune: the terminal prefix must match the target, and the form must not
    // already be guaranteed to yield more symbols than the target has.
    let prefix = true
    for (let i = 0; i < position; i++) {
      if (sentential[i] !== target[i]) prefix = false
    }
    if (!prefix) continue
    const minimum = sentential.reduce((sum, symbol) => sum + (variables.has(symbol) ? (min.get(symbol) ?? 1) : 1), 0)
    if (minimum > target.length) continue

    const head = sentential[position] as string
    grammar.productions.forEach((production, index) => {
      if (production.head !== head) return
      queue.push({
        sentential: [...sentential.slice(0, position), ...production.body, ...sentential.slice(position + 1)],
        path: [...path, index],
      })
    })
  }

  return found
}

/** Replay a leftmost derivation into its tree. */
export function replay(grammar: CFG, path: readonly number[]): CfgTreeNode[] {
  const variables = new Set(grammar.variables)
  let tree: TreeBuilder = startTree(grammar.start)

  for (const index of path) {
    const production = grammar.productions[index] as Production
    const position = tree.sentential.findIndex((symbol) => variables.has(symbol))
    if (position === -1) break
    tree = applyToTree(tree, production, position)
  }
  return tree.nodes
}

function samePath(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i])
}
