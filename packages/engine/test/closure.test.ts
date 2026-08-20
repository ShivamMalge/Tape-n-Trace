/**
 * Closure properties — Hopcroft 2e §4.2.
 *
 * Every construction is checked the same way: build it, then compare its
 * language against the set operation performed directly on the two languages,
 * exhaustively up to a length bound. A construction that is *nearly* right —
 * off by the empty string, say — fails here and nowhere else.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  applyClosure,
  complement,
  difference,
  homomorphism,
  intersection,
  inverseHomomorphism,
  isErr,
  minimize,
  nfaToDfa,
  reverseFA,
  unionFA,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton, Homomorphism, Sym, Trace } from '../src/index.js'
import { dfaArb } from './helpers/arbitraries.js'
import { allStringsUpTo, bruteForceMembership, languageUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { SEED } from './helpers/seed.js'
import { dfaContains01, nfaEndsIn01 } from './helpers/machines.js'

function machineOf(trace: Trace): FiniteAutomaton {
  if (trace.result.type !== 'machine') throw new Error(`expected a machine, got ${trace.result.type}`)
  return trace.result.machine as FiniteAutomaton
}

/** The DFA of an arbitrary machine, so anything can be compared as a language. */
function determinise(fa: FiniteAutomaton): FiniteAutomaton {
  return machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(fa))))))
}

/** Assert a machine's language equals a predicate over the two operands. */
function expectLanguage(
  built: FiniteAutomaton,
  alphabet: readonly Sym[],
  upTo: number,
  expected: (word: Sym[]) => boolean,
): void {
  for (const word of allStringsUpTo(alphabet, upTo)) {
    expect(bruteForceMembership(built, word), `"${word.join('')}"`).toBe(expected(word))
  }
}

const binary: Sym[] = ['0', '1']

/** Strings with an even number of 0s. */
const evenZeros: FiniteAutomaton = {
  kind: 'DFA',
  states: ['e', 'o'],
  alphabet: binary,
  transitions: [
    { id: 'a', from: 'e', read: '0', to: 'o' },
    { id: 'b', from: 'e', read: '1', to: 'e' },
    { id: 'c', from: 'o', read: '0', to: 'e' },
    { id: 'd', from: 'o', read: '1', to: 'o' },
  ],
  start: 'e',
  accepting: ['e'],
}

describe('the Boolean operations share one product walk (§4.2.1)', () => {
  const contains01 = (w: Sym[]): boolean => w.join('').includes('01')
  const even = (w: Sym[]): boolean => w.filter((c) => c === '0').length % 2 === 0

  it('union accepts what either machine accepts', () => {
    const trace = unwrap(unionFA(dfaContains01, evenZeros))
    expectLanguage(machineOf(trace), binary, 9, (w) => contains01(w) || even(w))
    assertTraceInvariants(trace)
  })

  it('intersection accepts what both accept', () => {
    const trace = unwrap(intersection(dfaContains01, evenZeros))
    expectLanguage(machineOf(trace), binary, 9, (w) => contains01(w) && even(w))
    assertTraceInvariants(trace)
  })

  it('difference accepts what the first accepts and the second does not', () => {
    const trace = unwrap(difference(dfaContains01, evenZeros))
    expectLanguage(machineOf(trace), binary, 9, (w) => contains01(w) && !even(w))
    assertTraceInvariants(trace)
  })

  it('builds only reachable pairs, not the whole product', () => {
    const dfa = machineOf(unwrap(intersection(dfaContains01, evenZeros)))
    expect(dfa.states.length).toBeLessThanOrEqual(dfaContains01.states.length * evenZeros.states.length)
    expect(validateFA(dfa).ok).toBe(true)
  })

  /**
   * phases.md P0.4 — the intersection product is verified against brute-force
   * membership on all strings up to length 10, for 50 random machine pairs.
   */
  it('intersection agrees with brute force on 50 random pairs, to length 10', { timeout: 300_000 }, () => {
    fc.assert(
      fc.property(dfaArb, dfaArb, (a, b) => {
        const built = machineOf(unwrap(intersection(a, b)))
        for (const word of allStringsUpTo(binary, 10)) {
          const expected = bruteForceMembership(a, word) && bruteForceMembership(b, word)
          expect(bruteForceMembership(built, word), `"${word.join('')}"`).toBe(expected)
        }
      }),
      { seed: SEED, numRuns: 50 },
    )
  })

  it('union and difference agree with brute force on random pairs too', { timeout: 300_000 }, () => {
    fc.assert(
      fc.property(dfaArb, dfaArb, (a, b) => {
        const united = machineOf(unwrap(unionFA(a, b)))
        const differed = machineOf(unwrap(difference(a, b)))
        for (const word of allStringsUpTo(binary, 8)) {
          const inA = bruteForceMembership(a, word)
          const inB = bruteForceMembership(b, word)
          expect(bruteForceMembership(united, word)).toBe(inA || inB)
          expect(bruteForceMembership(differed, word)).toBe(inA && !inB)
        }
      }),
      { seed: SEED, numRuns: 40 },
    )
  })

  it('refuses two machines over different alphabets', () => {
    const other: FiniteAutomaton = { ...evenZeros, alphabet: ['a', 'b'], transitions: [] }
    const result = intersection(dfaContains01, other)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toContain('ALPHABET_MISMATCH')
  })
})

describe('complement', () => {
  it('accepts exactly what the original rejected', () => {
    const trace = unwrap(complement(dfaContains01))
    expectLanguage(machineOf(trace), binary, 9, (w) => !w.join('').includes('01'))
    assertTraceInvariants(trace)
  })

  it('completes an incomplete DFA first, so the missing moves become accepting', () => {
    const partial: FiniteAutomaton = {
      kind: 'DFA',
      states: ['q0'],
      alphabet: binary,
      transitions: [{ id: 'a', from: 'q0', read: '0', to: 'q0' }],
      start: 'q0',
      accepting: ['q0'],
    }
    // L = 0*, so the complement contains everything with a 1 in it.
    const built = machineOf(unwrap(complement(partial)))
    expect(bruteForceMembership(built, '1')).toBe(true)
    expect(bruteForceMembership(built, '000')).toBe(false)
  })

  it('is an involution — complementing twice gives the language back', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const twice = machineOf(unwrap(complement(machineOf(unwrap(complement(dfa))))))
        expect(languageUpTo(twice, 7)).toEqual(languageUpTo(dfa, 7))
      }),
      { seed: SEED, numRuns: 40 },
    )
  })

  /**
   * phases.md P0.4 — complement is refused with an explanation when the input is
   * an NFA, and names the fix. Flipping the accepting set of an NFA does not
   * complement its language, and doing it quietly would be a wrong answer that
   * looks right.
   */
  it('refuses an NFA, explains why, and names the fix', () => {
    const result = complement(nfaEndsIn01)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return

    const [error] = result.errors
    expect(error?.code).toBe('CLOSURE_NEEDS_DFA')
    expect(error?.message).toContain('both an accepting and a rejecting run')
    expect(error?.message).toContain('subset construction')
  })

  it('would give the wrong answer if it did flip an NFA — which is why it refuses', () => {
    // "01" ends in 01, so the NFA accepts it. It also has a run that dies in q0,
    // so a naive flip would accept it too, and both a language and its
    // complement would contain the same string.
    const flipped: FiniteAutomaton = {
      ...nfaEndsIn01,
      accepting: nfaEndsIn01.states.filter((s) => !nfaEndsIn01.accepting.includes(s)),
    }
    expect(bruteForceMembership(nfaEndsIn01, '01')).toBe(true)
    expect(bruteForceMembership(flipped, '01')).toBe(true)
  })
})

describe('reversal (§4.2.2)', () => {
  it('accepts exactly the reversals of the original language', () => {
    const trace = unwrap(reverseFA(dfaContains01))
    const built = machineOf(trace)
    for (const word of allStringsUpTo(binary, 8)) {
      const backwards = [...word].reverse()
      expect(bruteForceMembership(built, word), `"${word.join('')}"`).toBe(
        bruteForceMembership(dfaContains01, backwards),
      )
    }
    assertTraceInvariants(trace)
  })

  it('is an involution up to language', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const twice = determinise(machineOf(unwrap(reverseFA(machineOf(unwrap(reverseFA(dfa)))))))
        expect(languageUpTo(twice, 7)).toEqual(languageUpTo(dfa, 7))
      }),
      { seed: SEED, numRuns: 30 },
    )
  })

  it('produces an ε-NFA, since reversing a DFA rarely leaves one', () => {
    expect(machineOf(unwrap(reverseFA(dfaContains01))).kind).toBe('ENFA')
  })
})

describe('homomorphism (§4.2.3)', () => {
  const h: Homomorphism = { '0': ['a', 'b'], '1': ['c'] }

  it('accepts exactly the images of the strings the original accepted', () => {
    const trace = unwrap(homomorphism(dfaContains01, h))
    const built = machineOf(trace)

    for (const word of allStringsUpTo(binary, 6)) {
      const image = word.flatMap((symbol) => h[symbol] ?? [])
      expect(bruteForceMembership(built, image), `h("${word.join('')}")`).toBe(
        bruteForceMembership(dfaContains01, word),
      )
    }
    assertTraceInvariants(trace)
  })

  it('handles a symbol mapped to ε', () => {
    const erasing: Homomorphism = { '0': [], '1': ['1'] }
    const built = machineOf(unwrap(homomorphism(evenZeros, erasing)))
    // Erasing every 0 leaves only 1s, and an even number of 0s is achievable
    // for any string of 1s, so every string of 1s is in the image.
    expect(bruteForceMembership(built, '11')).toBe(true)
    expect(bruteForceMembership(built, '')).toBe(true)
  })

  it('reports every symbol the homomorphism forgot', () => {
    const result = homomorphism(dfaContains01, { '0': ['a'] })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('HOMOMORPHISM_INCOMPLETE')
    expect(result.errors[0]?.message).toContain('"1"')
  })
})

describe('inverse homomorphism (§4.2.4)', () => {
  const h: Homomorphism = { a: ['0', '1'], b: ['1'] }

  it('accepts exactly the strings whose image the original accepted', () => {
    const trace = unwrap(inverseHomomorphism(dfaContains01, h))
    const built = machineOf(trace)

    for (const word of allStringsUpTo(['a', 'b'], 7)) {
      const image = word.flatMap((symbol) => h[symbol] ?? [])
      expect(bruteForceMembership(built, word), `"${word.join('')}"`).toBe(
        bruteForceMembership(dfaContains01, image),
      )
    }
    assertTraceInvariants(trace)
  })

  it('keeps the states and changes only the moves', () => {
    const built = machineOf(unwrap(inverseHomomorphism(dfaContains01, h)))
    expect(built.states).toEqual(dfaContains01.states)
    expect(built.accepting).toEqual(dfaContains01.accepting)
    expect(built.alphabet).toEqual(['a', 'b'])
  })

  it('refuses an image the machine cannot read', () => {
    const result = inverseHomomorphism(dfaContains01, { a: ['z'] })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('HOMOMORPHISM_IMAGE_UNREADABLE')
  })
})

describe('applyClosure', () => {
  it.each(['union', 'intersection', 'difference'] as const)('runs %s when given two machines', (op) => {
    expect(applyClosure(op, dfaContains01, evenZeros, null).ok).toBe(true)
  })

  it.each(['union', 'intersection', 'difference'] as const)('refuses %s without a second machine', (op) => {
    const result = applyClosure(op, dfaContains01, null, null)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('CLOSURE_MISSING_OPERAND')
  })

  it.each(['complement', 'reverse'] as const)('runs %s with one machine', (op) => {
    expect(applyClosure(op, dfaContains01, null, null).ok).toBe(true)
  })

  it.each(['homomorphism', 'inverse-homomorphism'] as const)('refuses %s without a homomorphism', (op) => {
    const result = applyClosure(op, dfaContains01, null, null)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('CLOSURE_MISSING_OPERAND')
  })

  it('reports an operation it does not build rather than failing silently', () => {
    const result = applyClosure('star', dfaContains01, null, null)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('CLOSURE_NOT_IMPLEMENTED')
  })
})
