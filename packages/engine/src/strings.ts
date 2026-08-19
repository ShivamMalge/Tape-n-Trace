/**
 * Strings and languages — Hopcroft 2e §1.5.
 *
 * The Module 1 vocabulary, as functions: length, powers of an alphabet, Σ*,
 * and concatenation. Small enough to look trivial, and worth having in the
 * engine anyway — the primer page, the test oracle and the notebook package all
 * enumerate Σ*, and three hand-rolled nested loops would eventually disagree
 * about whether the empty string is in Σ⁰. (It is.)
 */

import type { Sym } from './types.js'

/**
 * Σ^k — every string of exactly length `k`, in alphabet order.
 * Σ⁰ is `[[]]`: one string, the empty one. Not the empty set.
 */
export function alphabetPower(alphabet: readonly Sym[], k: number): Sym[][] {
  if (!Number.isInteger(k) || k < 0) {
    throw new RangeError(`A power of an alphabet needs a whole k ≥ 0, received ${k}`)
  }

  let level: Sym[][] = [[]]
  for (let i = 0; i < k; i++) {
    const next: Sym[][] = []
    for (const word of level) {
      for (const symbol of alphabet) next.push([...word, symbol])
    }
    level = next
  }
  return level
}

export interface EnumerationOptions {
  /**
   * Stop after this many strings. |Σ*| grows as |Σ|^k, so an unbounded
   * enumeration is a hang waiting to happen; callers that want everything pass
   * `Infinity` knowingly.
   */
  limit?: number
}

/**
 * Every string over `alphabet` of length at most `maxLength`, shortest first and
 * in alphabet order within a length.
 *
 * The ordering is load-bearing for the test oracle: a search that yields
 * shortest-first reports the *shortest* counterexample, which is the one worth
 * reading.
 */
export function* allStringsUpTo(
  alphabet: readonly Sym[],
  maxLength: number,
): Generator<Sym[], void, undefined> {
  let level: Sym[][] = [[]]

  for (let len = 0; len <= maxLength; len++) {
    for (const word of level) yield word
    const next: Sym[][] = []
    for (const word of level) {
      for (const symbol of alphabet) next.push([...word, symbol])
    }
    level = next
  }
}

export interface Enumeration {
  words: Sym[][]
  /** How many strings exist at this bound, whether or not they were all listed. */
  total: number
  /** Set when `limit` cut the list short. A silent cap is a defect (§9). */
  truncated?: { reason: string; limit: number }
}

/**
 * Σ* up to a length, as a list rather than a generator, with an honest report
 * when the limit cut it short.
 */
export function enumerateUpTo(
  alphabet: readonly Sym[],
  maxLength: number,
  options: EnumerationOptions = {},
): Enumeration {
  const limit = options.limit ?? 2_000
  const total = countUpTo(alphabet.length, maxLength)

  const words: Sym[][] = []
  for (const word of allStringsUpTo(alphabet, maxLength)) {
    if (words.length >= limit) break
    words.push(word)
  }

  return words.length < total
    ? {
        words,
        total,
        truncated: {
          reason: `There are ${total.toLocaleString('en')} strings of length at most ${maxLength} over this alphabet; the first ${words.length.toLocaleString('en')} are listed.`,
          limit,
        },
      }
    : { words, total }
}

/**
 * How many strings of length at most `maxLength` exist over an alphabet of
 * `size` symbols: the geometric sum 1 + s + s² + ... + s^k.
 */
export function countUpTo(size: number, maxLength: number): number {
  if (maxLength < 0) return 0
  if (size === 1) return maxLength + 1

  let total = 0
  let power = 1
  for (let i = 0; i <= maxLength; i++) {
    total += power
    power *= size
  }
  return total
}

/** Concatenation, written the way §1.5 writes it. */
export function concat(x: readonly Sym[], y: readonly Sym[]): Sym[] {
  return [...x, ...y]
}

/** Reversal, w^R. */
export function reverse(w: readonly Sym[]): Sym[] {
  return [...w].reverse()
}

/** The string as it would be written on paper; the empty string shows as ε. */
export function displayWord(w: readonly Sym[]): string {
  return w.length === 0 ? 'ε' : w.join('')
}
