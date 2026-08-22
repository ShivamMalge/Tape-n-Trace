/**
 * The DPDA checker — Hopcroft 2e §6.4.1.
 *
 * P is deterministic iff for every state q, input symbol a and stack top X:
 * δ(q, a, X) has at most one element, and if δ(q, ε, X) is nonempty then
 * δ(q, a, X) is empty for every a. Equivalently: no *pair* of transitions from
 * the same state can ever both apply to one ID. The checker reports exactly
 * those pairs, because "not deterministic" without the offending pair is not
 * something a student can act on.
 *
 * A `pop: null` transition (the JFLAP shorthand for "any top") applies whatever
 * the top is, so it is compatible with every pop guard — including another null.
 */

import type { PDA, PDATransition } from '../types.js'

export interface DeterminismViolation {
  /** Transition ids, in machine order. */
  a: string
  b: string
  /** Why the two can fire on the same ID, in exam language. */
  reason: string
}

export interface DeterminismReport {
  deterministic: boolean
  violations: DeterminismViolation[]
}

function popsOverlap(a: PDATransition, b: PDATransition): boolean {
  return a.pop === null || b.pop === null || a.pop === b.pop
}

function popText(t: PDATransition): string {
  return t.pop === null ? 'any stack top' : `stack top ${t.pop}`
}

/**
 * Report every pair of transitions that can apply to the same ID.
 * The machine is a DPDA iff the list is empty (§6.4.1).
 */
export function checkDeterminism(machine: PDA): DeterminismReport {
  const violations: DeterminismViolation[] = []
  const list = machine.transitions

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i] as PDATransition
      const b = list[j] as PDATransition
      if (a.from !== b.from) continue
      if (!popsOverlap(a, b)) continue

      if (a.read !== null && b.read !== null && a.read !== b.read) continue

      if (a.read === null && b.read !== null) {
        violations.push({
          a: a.id,
          b: b.id,
          reason: `In state ${a.from} with ${popText(a)}, the ε-move competes with the move reading ${b.read}: the machine must choose whether to consume input.`,
        })
      } else if (b.read === null && a.read !== null) {
        violations.push({
          a: a.id,
          b: b.id,
          reason: `In state ${a.from} with ${popText(b)}, the ε-move competes with the move reading ${a.read}: the machine must choose whether to consume input.`,
        })
      } else if (a.read === null && b.read === null) {
        violations.push({
          a: a.id,
          b: b.id,
          reason: `In state ${a.from} with ${popText(a)}, two ε-moves apply: δ(${a.from}, ε, ${a.pop ?? b.pop ?? 'X'}) has more than one element.`,
        })
      } else {
        violations.push({
          a: a.id,
          b: b.id,
          reason: `In state ${a.from} with ${popText(a)}, two moves read ${a.read}: δ(${a.from}, ${a.read}, ${a.pop ?? b.pop ?? 'X'}) has more than one element.`,
        })
      }
    }
  }

  return { deterministic: violations.length === 0, violations }
}
