/**
 * fast-check generators for small finite automata — architecture.md §11.
 *
 * Bounded on purpose: at most 4 states over a 2-symbol alphabet. Unbounded
 * generators make CI flaky rather than thorough, and the round-trip properties
 * these feed (P0.3 onward) blow up super-exponentially in machine size.
 */

import fc from 'fast-check'
import { faTransitionId } from '../../src/index.js'
import type { FATransition, FiniteAutomaton, StateId, Sym } from '../../src/index.js'
import { ALPHABET, MAX_STATES } from './seed.js'

const alphabet: Sym[] = [...ALPHABET]

function statesOf(n: number): StateId[] {
  return Array.from({ length: n }, (_, i) => `q${i}`)
}

/** Every (state, symbol) pair, in a fixed order so generation is reproducible. */
function pairs(states: StateId[]): { from: StateId; read: Sym }[] {
  return states.flatMap((from) => alphabet.map((read) => ({ from, read })))
}

function assemble(
  kind: FiniteAutomaton['kind'],
  states: StateId[],
  transitions: FATransition[],
  acceptingFlags: boolean[],
): FiniteAutomaton {
  return {
    kind,
    states,
    alphabet,
    transitions,
    start: states[0] as StateId,
    accepting: states.filter((_, i) => acceptingFlags[i] === true),
  }
}

/**
 * A complete DFA: exactly one move per (state, symbol), which is Hopcroft's
 * total δ. Start state is always `q0`.
 */
export const dfaArb: fc.Arbitrary<FiniteAutomaton> = fc
  .integer({ min: 1, max: MAX_STATES })
  .chain((n) => {
    const states = statesOf(n)
    const slots = pairs(states)

    return fc
      .record({
        targets: fc.array(fc.integer({ min: 0, max: n - 1 }), {
          minLength: slots.length,
          maxLength: slots.length,
        }),
        accepting: fc.array(fc.boolean(), { minLength: n, maxLength: n }),
      })
      .map(({ targets, accepting }) => {
        const transitions = slots.map((slot, i) => {
          const to = states[targets[i] as number] as StateId
          return { id: faTransitionId(slot.from, slot.read, to), from: slot.from, read: slot.read, to }
        })
        return assemble('DFA', states, transitions, accepting)
      })
  })

/**
 * A partial DFA — some (state, symbol) pairs have no move, which is what a
 * half-drawn diagram looks like and what the implicit dead state means.
 */
export const partialDfaArb: fc.Arbitrary<FiniteAutomaton> = fc
  .integer({ min: 1, max: MAX_STATES })
  .chain((n) => {
    const states = statesOf(n)
    const slots = pairs(states)

    return fc
      .record({
        // -1 means "no move on this pair".
        targets: fc.array(fc.integer({ min: -1, max: n - 1 }), {
          minLength: slots.length,
          maxLength: slots.length,
        }),
        accepting: fc.array(fc.boolean(), { minLength: n, maxLength: n }),
      })
      .map(({ targets, accepting }) => {
        const transitions = slots.flatMap((slot, i) => {
          const index = targets[i] as number
          if (index < 0) return []
          const to = states[index] as StateId
          return [{ id: faTransitionId(slot.from, slot.read, to), from: slot.from, read: slot.read, to }]
        })
        return assemble('DFA', states, transitions, accepting)
      })
  })

/** An NFA: each (state, symbol) pair gets any subset of the states as targets. */
export const nfaArb: fc.Arbitrary<FiniteAutomaton> = fc
  .integer({ min: 1, max: MAX_STATES })
  .chain((n) => {
    const states = statesOf(n)
    const slots = pairs(states)

    return fc
      .record({
        targets: fc.array(fc.array(fc.boolean(), { minLength: n, maxLength: n }), {
          minLength: slots.length,
          maxLength: slots.length,
        }),
        accepting: fc.array(fc.boolean(), { minLength: n, maxLength: n }),
      })
      .map(({ targets, accepting }) => {
        const transitions = slots.flatMap((slot, i) => {
          const flags = targets[i] as boolean[]
          return states.flatMap((to, j) =>
            flags[j] === true
              ? [{ id: faTransitionId(slot.from, slot.read, to), from: slot.from, read: slot.read, to }]
              : [],
          )
        })
        return assemble('NFA', states, transitions, accepting)
      })
  })

/**
 * An ε-NFA: an NFA plus a set of ε-transitions, cycles included. The oracle
 * memoises on configurations precisely so an ε-cycle here cannot hang it.
 */
export const enfaArb: fc.Arbitrary<FiniteAutomaton> = fc
  .integer({ min: 1, max: MAX_STATES })
  .chain((n) => {
    const states = statesOf(n)
    const slots = pairs(states)

    return fc
      .record({
        targets: fc.array(fc.array(fc.boolean(), { minLength: n, maxLength: n }), {
          minLength: slots.length,
          maxLength: slots.length,
        }),
        epsilon: fc.array(fc.array(fc.boolean(), { minLength: n, maxLength: n }), {
          minLength: n,
          maxLength: n,
        }),
        accepting: fc.array(fc.boolean(), { minLength: n, maxLength: n }),
      })
      .map(({ targets, epsilon, accepting }) => {
        const symbolMoves = slots.flatMap((slot, i) => {
          const flags = targets[i] as boolean[]
          return states.flatMap((to, j) =>
            flags[j] === true
              ? [{ id: faTransitionId(slot.from, slot.read, to), from: slot.from, read: slot.read, to }]
              : [],
          )
        })

        const epsilonMoves = states.flatMap((from, i) => {
          const flags = epsilon[i] as boolean[]
          return states.flatMap((to, j) =>
            flags[j] === true && from !== to
              ? [{ id: faTransitionId(from, null, to), from, read: null, to }]
              : [],
          )
        })

        return assemble('ENFA', states, [...symbolMoves, ...epsilonMoves], accepting)
      })
  })

/** Input strings over the generator alphabet, up to a given length. */
export function wordArb(maxLength: number): fc.Arbitrary<Sym[]> {
  return fc.array(fc.constantFrom(...alphabet), { minLength: 0, maxLength })
}
