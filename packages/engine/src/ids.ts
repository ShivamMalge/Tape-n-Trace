/**
 * Canonical naming — architecture.md §4.
 *
 * Determinism is a correctness property (§2.5): running a conversion twice must
 * produce byte-identical output, generated state names included. Grading and
 * trace diffing both compare traces across runs, so every generated identifier
 * in the engine comes from this file and nowhere else.
 */

import type { Read, StateId, TransitionId } from './types.js'

/**
 * A total order on state ids that reads the way a student writes them:
 * `q2` before `q10`, not after. Digit runs compare numerically, everything else
 * compares by code unit, and identical-under-natural-order ids fall back to a
 * raw comparison so the order is total — two distinct ids never tie.
 */
export function compareStateIds(a: StateId, b: StateId): number {
  const chunks = (s: string): string[] => s.match(/\d+|\D+/g) ?? []
  const ca = chunks(a)
  const cb = chunks(b)

  for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
    const x = ca[i] as string
    const y = cb[i] as string
    const xNum = /^\d/.test(x)
    const yNum = /^\d/.test(y)

    if (xNum && yNum) {
      const d = Number(x) - Number(y)
      if (d !== 0) return d < 0 ? -1 : 1
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }

  if (ca.length !== cb.length) return ca.length < cb.length ? -1 : 1
  // Natural order tied (e.g. "q01" and "q1"). Break it rawly so the order is total.
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** Sort into canonical order, without mutating the caller's array. */
export function sortStateIds(ids: readonly StateId[]): StateId[] {
  return [...ids].sort(compareStateIds)
}

/**
 * The canonical name of a subset-construction state: sorted, comma-joined,
 * brace-wrapped. `{q1, q0, q2}` is always `{q0,q1,q2}` (Hopcroft 2.3.5).
 *
 * The empty set is `{}` rather than `∅` — the engine emits no display glyphs,
 * for the same reason epsilon is `null` (ADR-002). Renderers map it.
 *
 * Duplicates are collapsed: the argument is a set, however the caller spelled it.
 */
export function subsetStateName(ids: readonly StateId[]): StateId {
  const unique = sortStateIds([...new Set(ids)])
  return `{${unique.join(',')}}`
}

/** Read a subset-construction name back into its members. Inverse of `subsetStateName`. */
export function parseSubsetStateName(name: StateId): StateId[] | null {
  if (!name.startsWith('{') || !name.endsWith('}')) return null
  const body = name.slice(1, -1)
  if (body === '') return []
  return body.split(',')
}

/**
 * The canonical name of a product-construction state, used by the equivalence
 * checker and the closure lab (Hopcroft 4.2). `(p,q)`, in argument order —
 * the product of A and B is not the product of B and A.
 */
export function productStateName(a: StateId, b: StateId): StateId {
  return `(${a},${b})`
}

/**
 * The canonical id of a finite-automaton transition.
 *
 * Epsilon renders as empty brackets: `q0-[]->q1`. A symbol is never the empty
 * string (validation rejects one), so an ε-transition can never collide with a
 * symbol transition — including on an alphabet that itself contains "ε".
 */
export function faTransitionId(from: StateId, read: Read, to: StateId): TransitionId {
  return `${from}-[${read ?? ''}]->${to}`
}

/**
 * Canonical relabelling: the i-th state becomes `q<i>`. Used when a conversion
 * must present a clean machine rather than a machine full of `{q0,q1}` names.
 * The mapping follows the order given, so callers control it explicitly.
 */
export function canonicalRenaming(
  states: readonly StateId[],
  prefix = 'q',
): Record<StateId, StateId> {
  const mapping: Record<StateId, StateId> = {}
  states.forEach((id, i) => {
    mapping[id] = `${prefix}${i}`
  })
  return mapping
}

/**
 * A name not already taken, formed by suffixing the base. `q` with `q`, `q1`
 * taken yields `q2`. Deterministic: the same base and the same taken set always
 * produce the same name.
 */
export function freshStateId(base: string, taken: Iterable<StateId>): StateId {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let i = 1; ; i++) {
    const candidate = `${base}${i}`
    if (!used.has(candidate)) return candidate
  }
}
