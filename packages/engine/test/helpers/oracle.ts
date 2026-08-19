/**
 * An independent membership oracle — architecture.md §11.
 *
 * This exists to disagree with the engine. It is written deliberately unlike the
 * simulators: depth-first over configurations with memoisation, where
 * `simulateNFA` walks a breadth-first branch tree and `simulateENFA` carries a
 * state set. A bug would have to occur twice, in two different shapes, to hide.
 *
 * The membership oracle is test-only by design — it must never become the thing
 * it is checking. Enumeration is not: `allStringsUpTo` is engine surface (§1.5)
 * that the primer page and the notebook package use too, so it is imported
 * rather than kept as a third private copy that could quietly diverge.
 */

import { allStringsUpTo } from '../../src/index.js'
import type { FiniteAutomaton, StateId, Sym } from '../../src/index.js'

// Re-exported so tests keep importing enumeration from one obvious place.
export { allStringsUpTo }

/**
 * Whether the automaton accepts the input, by exhaustive search over
 * configurations. Handles DFA, NFA and ε-NFA uniformly — a DFA is just an NFA
 * that happens to have one move per pair.
 */
export function bruteForceMembership(fa: FiniteAutomaton, input: string | readonly Sym[]): boolean {
  const symbols = typeof input === 'string' ? [...input] : [...input]
  const accepting = new Set(fa.accepting)
  const visited = new Set<string>()

  /**
   * Can an accepting configuration be reached from (state, pos)?
   *
   * Memoising on the configuration rather than on the path is what makes this
   * terminate on an ε-cycle: revisiting a configuration that has already failed
   * cannot succeed the second time.
   */
  const reaches = (state: StateId, pos: number): boolean => {
    const key = `${state}@${pos}`
    if (visited.has(key)) return false
    visited.add(key)

    if (pos === symbols.length && accepting.has(state)) return true

    for (const t of fa.transitions) {
      if (t.from !== state) continue

      if (t.read === null) {
        if (reaches(t.to, pos)) return true
      } else if (pos < symbols.length && t.read === symbols[pos]) {
        if (reaches(t.to, pos + 1)) return true
      }
    }

    return false
  }

  return reaches(fa.start, 0)
}

/** The language of an automaton up to a length bound, as a set of strings. */
export function languageUpTo(fa: FiniteAutomaton, maxLength: number): Set<string> {
  const inLanguage = new Set<string>()
  for (const word of allStringsUpTo(fa.alphabet, maxLength)) {
    if (bruteForceMembership(fa, word)) inLanguage.add(word.join(''))
  }
  return inLanguage
}
