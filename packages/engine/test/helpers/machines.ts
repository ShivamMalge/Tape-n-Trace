/**
 * Test fixtures — architecture.md §11.1.
 *
 * The textbook machines live in `src/fa/gallery.ts`, because they are the
 * presets the app ships, not test data. They are re-exported here so a test
 * reads naturally, and so a preset that breaks breaks the suite.
 *
 * What is defined below is genuinely test-only: degenerate and malformed
 * machines that exercise edge cases no student should be shown as an example.
 */

import { faTransitionId } from '../../src/index.js'
import type { FiniteAutomaton, FATransition, Read, StateId, Sym } from '../../src/index.js'

export {
  dfaContains01,
  enfaZerosThenOnes,
  nfaEndsIn01,
  nfaEvenZerosOrEndsIn1,
} from '../../src/index.js'

/** Build a transition with its canonical id, so fixtures cannot drift from `ids.ts`. */
export function t(from: StateId, read: Read, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

const binary: Sym[] = ['0', '1']

/**
 * An ε-NFA with an ε-cycle. Closure must terminate and must return the same set
 * whichever state of the cycle it started from.
 */
export const enfaEpsilonCycle: FiniteAutomaton = {
  kind: 'ENFA',
  states: ['A', 'B', 'C'],
  alphabet: binary,
  transitions: [t('A', null, 'B'), t('B', null, 'A'), t('B', '0', 'C')],
  start: 'A',
  accepting: ['C'],
}

/**
 * An incomplete DFA accepting 0*. There is no move from `q0` on 1, which is the
 * implicit dead state a textbook diagram leaves off — not a validation error.
 */
export const partialDfaZeros: FiniteAutomaton = {
  kind: 'DFA',
  states: ['q0'],
  alphabet: binary,
  transitions: [t('q0', '0', 'q0')],
  start: 'q0',
  accepting: ['q0'],
}

/** A DFA accepting nothing — one state, complete, no accepting states. */
export const dfaEmptyLanguage: FiniteAutomaton = {
  kind: 'DFA',
  states: ['q0'],
  alphabet: binary,
  transitions: [t('q0', '0', 'q0'), t('q0', '1', 'q0')],
  start: 'q0',
  accepting: [],
}
