/**
 * The preset languages of the pumping game, each with a real decision
 * procedure — phases.md P1.2.
 *
 * "Real decidable membership for every preset language. No pattern matching."
 * Every `membership` below implements the language's mathematical definition —
 * counting, scanning, arithmetic — rather than matching against a regex. The
 * distinction matters because the game's verdicts rest entirely on these
 * answers: an oracle that is sloppy about `0011` versus `0101` decides games
 * wrongly, and the student has no way to notice.
 *
 * The regular presets go one better: their oracle *is* their DFA, run by the
 * shared simulator. A machine deciding its own language is the most honest
 * oracle there is, and it hands reverse mode the true pumping length and the
 * winning decomposition for free.
 */

import { faTransitionId } from '../ids.js'
import { simulateDFA } from '../fa/simulate.js'
import type { FATransition, FiniteAutomaton, Read, StateId, Sym } from '../types.js'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface PumpingLanguage {
  id: string
  title: string
  /** Set-builder notation, as the exam writes it. */
  notation: string
  alphabet: Sym[]
  /** Whether the language actually is regular / context-free. */
  regular: boolean
  contextFree: boolean
  difficulty: Difficulty
  /** The oracle. Implements the definition; never a regex. */
  membership: (word: readonly Sym[]) => boolean
  /** A good attack string for a given claimed pumping length. */
  suggestedW: (n: number) => string
  /** For regular presets: the machine whose language this is. */
  dfa?: FiniteAutomaton
  /** One clause for the generated proof, describing where y must fall. */
  proofNote: string
}

function t(from: StateId, read: Read, to: StateId): FATransition {
  return { id: faTransitionId(from, read, to), from, read, to }
}

/** 0^a then 1^b, nothing interleaved. Returns null when the shape is wrong. */
function blockCounts(word: readonly Sym[], symbols: readonly Sym[]): number[] | null {
  const counts = symbols.map(() => 0)
  let block = 0
  for (const sym of word) {
    const at = symbols.indexOf(sym)
    if (at === -1 || at < block) return null
    block = at
    counts[at] = (counts[at] ?? 0) + 1
  }
  return counts
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) return false
  }
  return true
}

/** Membership by the machine itself, through the one shared simulator. */
function byDFA(dfa: FiniteAutomaton): (word: readonly Sym[]) => boolean {
  return (word) => {
    const run = simulateDFA(dfa, [...word])
    return run.ok && run.value.result.type === 'acceptance' && run.value.result.accepted
  }
}

/** Strings over {0,1} ending in 01 — regular, for reverse mode. */
const endsIn01Dfa: FiniteAutomaton = {
  kind: 'DFA',
  states: ['e', 'z', 'a'],
  alphabet: ['0', '1'],
  transitions: [
    t('e', '0', 'z'),
    t('e', '1', 'e'),
    t('z', '0', 'z'),
    t('z', '1', 'a'),
    t('a', '0', 'z'),
    t('a', '1', 'e'),
  ],
  start: 'e',
  accepting: ['a'],
}

/** Strings over {0,1} with an even number of 0s — regular, for reverse mode. */
const evenZerosDfa: FiniteAutomaton = {
  kind: 'DFA',
  states: ['even', 'odd'],
  alphabet: ['0', '1'],
  transitions: [
    t('even', '0', 'odd'),
    t('even', '1', 'even'),
    t('odd', '0', 'even'),
    t('odd', '1', 'odd'),
  ],
  start: 'even',
  accepting: ['even'],
}

export const PUMPING_LANGUAGES: PumpingLanguage[] = [
  {
    id: 'zeros-ones-equal',
    title: 'Equal zeros then ones',
    notation: 'L = { 0ⁿ1ⁿ : n ≥ 0 }',
    alphabet: ['0', '1'],
    regular: false,
    contextFree: true,
    difficulty: 'easy',
    membership: (word) => {
      const counts = blockCounts(word, ['0', '1'])
      return counts !== null && counts[0] === counts[1]
    },
    suggestedW: (n) => '0'.repeat(n) + '1'.repeat(n),
    proofNote: 'since |xy| ≤ n, y lies entirely inside the leading block of 0s',
  },
  {
    id: 'zeros-at-most-ones',
    title: 'No more zeros than ones',
    notation: 'L = { 0ⁿ1ᵐ : n ≤ m }',
    alphabet: ['0', '1'],
    regular: false,
    contextFree: true,
    difficulty: 'medium',
    membership: (word) => {
      const counts = blockCounts(word, ['0', '1'])
      return counts !== null && (counts[0] as number) <= (counts[1] as number)
    },
    suggestedW: (n) => '0'.repeat(n) + '1'.repeat(n),
    proofNote:
      'y lies inside the 0-block, so pumping up adds 0s until they outnumber the 1s — note that pumping down does not help here',
  },
  {
    id: 'balanced-parens',
    title: 'Balanced parentheses',
    notation: 'L = { w ∈ {(,)}* : w is balanced }',
    alphabet: ['(', ')'],
    regular: false,
    contextFree: true,
    difficulty: 'medium',
    membership: (word) => {
      let depth = 0
      for (const sym of word) {
        depth += sym === '(' ? 1 : -1
        if (depth < 0) return false
      }
      return depth === 0
    },
    suggestedW: (n) => '('.repeat(n) + ')'.repeat(n),
    proofNote: 'y falls inside the run of opening brackets, so pumping unbalances the string',
  },
  {
    id: 'ww',
    title: 'A word doubled',
    notation: 'L = { ww : w ∈ {0,1}* }',
    alphabet: ['0', '1'],
    regular: false,
    contextFree: false,
    difficulty: 'hard',
    membership: (word) => {
      if (word.length % 2 !== 0) return false
      const half = word.length / 2
      for (let i = 0; i < half; i++) {
        if (word[i] !== word[i + half]) return false
      }
      return true
    },
    suggestedW: (n) => '0'.repeat(n) + '1' + '0'.repeat(n) + '1',
    proofNote: 'y sits inside the first half, so pumping shifts the midpoint and the two halves disagree',
  },
  {
    id: 'primes',
    title: 'Prime-length strings of zeros',
    notation: 'L = { 0ⁱ : i is prime }',
    alphabet: ['0'],
    regular: false,
    contextFree: false,
    difficulty: 'hard',
    membership: (word) => word.every((s) => s === '0') && isPrime(word.length),
    // The smallest prime ≥ n whose successor block also embarrasses naive splits.
    suggestedW: (n) => {
      let p = Math.max(n, 2)
      while (!isPrime(p)) p++
      return '0'.repeat(p)
    },
    proofNote:
      'y = 0ᵏ for some k ≥ 1, and pumping i times gives length p + (i−1)k; choosing i = p + 1 makes the length p(1 + k), a product — composite',
  },
  {
    id: 'abc-equal',
    title: 'Equal a-b-c blocks',
    notation: 'L = { aⁿbⁿcⁿ : n ≥ 0 }',
    alphabet: ['a', 'b', 'c'],
    regular: false,
    contextFree: false,
    difficulty: 'medium',
    membership: (word) => {
      const counts = blockCounts(word, ['a', 'b', 'c'])
      return counts !== null && counts[0] === counts[1] && counts[1] === counts[2]
    },
    suggestedW: (n) => 'a'.repeat(n) + 'b'.repeat(n) + 'c'.repeat(n),
    proofNote: 'the pumped window spans at most two of the three blocks, so the third count is left behind',
  },
  {
    id: 'ends-in-01',
    title: 'Ends in 01 (regular!)',
    notation: 'L = { w ∈ {0,1}* : w ends in 01 }',
    alphabet: ['0', '1'],
    regular: true,
    contextFree: true,
    difficulty: 'easy',
    membership: byDFA(endsIn01Dfa),
    suggestedW: (n) => '0'.repeat(Math.max(n - 2, 1)) + '01',
    dfa: endsIn01Dfa,
    proofNote: 'the language is regular, so a decomposition from the DFA loop survives every i',
  },
  {
    id: 'even-zeros',
    title: 'An even number of 0s (regular!)',
    notation: 'L = { w ∈ {0,1}* : the number of 0s in w is even }',
    alphabet: ['0', '1'],
    regular: true,
    contextFree: true,
    difficulty: 'easy',
    membership: byDFA(evenZerosDfa),
    suggestedW: (n) => '00'.repeat(Math.ceil(n / 2)),
    dfa: evenZerosDfa,
    proofNote: 'the language is regular, so a decomposition from the DFA loop survives every i',
  },
]

export function pumpingLanguage(id: string): PumpingLanguage | undefined {
  return PUMPING_LANGUAGES.find((language) => language.id === id)
}
