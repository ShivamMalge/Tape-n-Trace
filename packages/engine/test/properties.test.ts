/**
 * Oracle and property tests — architecture.md §11.2, the backbone.
 *
 * Unit tests confirm the worked examples from the book. These confirm the engine
 * on machines nobody wrote down, by checking it against an independently written
 * oracle over an exhaustive set of inputs.
 *
 * **On the bounds.** Each check is exhaustive up to its length — no sampling —
 * so a counterexample is always the shortest one. The lengths differ by machine
 * kind because cost does: a DFA run is one path, an NFA run is a branch tree,
 * and an ε-NFA run takes two steps per symbol. The DFA bound is the one
 * phases.md fixes (200 machines, every string up to length 12) and costs roughly
 * two and a half minutes; the rest are sized to keep the whole suite inside a
 * sensible CI budget. Widen them deliberately, not by accident.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { deserialise, isOk, serialise, simulate, simulateDFA, unwrap } from '../src/index.js'
import type { FiniteAutomaton, Sym, Trace } from '../src/index.js'
import { dfaArb, enfaArb, nfaArb, partialDfaArb, wordArb } from './helpers/arbitraries.js'
import { allStringsUpTo, bruteForceMembership } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { RUNS, SEED } from './helpers/seed.js'

const DFA_MAX_LENGTH = 12
const NFA_MAX_LENGTH = 8
const ENFA_MAX_LENGTH = 8

/** Two minutes of headroom over the measured cost of the heaviest check. */
const SLOW = { timeout: 300_000 }

/**
 * Hand control back to the event loop.
 *
 * These checks are CPU-bound for minutes at a time. A synchronous run starves
 * the vitest worker's progress channel, and the run dies on an RPC timeout with
 * every assertion having passed — a red build with no failing test in it. One
 * yield every few thousand strings costs nothing and removes the failure mode
 * entirely, which is why the exhaustive loop below is async.
 */
const breathe = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve))
const YIELD_EVERY = 2_000

/**
 * Run every string up to `maxLength` through the engine and the oracle, and
 * return the first disagreement — the shortest one, since `allStringsUpTo`
 * yields shortest-first.
 */
async function firstDisagreement(fa: FiniteAutomaton, maxLength: number): Promise<Sym[] | null> {
  let sinceYield = 0

  for (const word of allStringsUpTo(fa.alphabet, maxLength)) {
    const result = simulate(fa, word)
    if (!isOk(result)) return word

    const verdict = result.value.result
    const accepted = verdict.type === 'acceptance' && verdict.accepted
    if (accepted !== bruteForceMembership(fa, word)) return word

    if (++sinceYield >= YIELD_EVERY) {
      sinceYield = 0
      await breathe()
    }
  }

  return null
}

async function expectAgreement(fa: FiniteAutomaton, maxLength: number): Promise<void> {
  const witness = await firstDisagreement(fa, maxLength)
  expect(
    witness,
    witness === null ? '' : `engine and oracle disagree on "${witness.join('')}" for ${JSON.stringify(fa)}`,
  ).toBeNull()
}

describe('oracle agreement', () => {
  /**
   * phases.md P0.1: "simulateDFA agrees with the brute-force oracle on all
   * strings up to length 12, for 200 random DFAs." Held to the letter — this is
   * the engine's central correctness gate, and the slowest thing in the suite at
   * roughly four minutes under coverage.
   */
  it(
    `agrees with the oracle on every string up to length ${DFA_MAX_LENGTH}, over ${RUNS} random DFAs`,
    SLOW,
    async () => {
      await fc.assert(
        fc.asyncProperty(dfaArb, (fa) => expectAgreement(fa, DFA_MAX_LENGTH)),
        { seed: SEED, numRuns: RUNS },
      )
    },
  )

  it('agrees with the oracle on incomplete DFAs, where a missing move means rejection', SLOW, async () => {
    await fc.assert(
      fc.asyncProperty(partialDfaArb, (fa) => expectAgreement(fa, 10)),
      { seed: SEED, numRuns: 60 },
    )
  })

  it(`agrees with the oracle on every string up to length ${NFA_MAX_LENGTH}, over random NFAs`, SLOW, async () => {
    await fc.assert(
      fc.asyncProperty(nfaArb, (fa) => expectAgreement(fa, NFA_MAX_LENGTH)),
      { seed: SEED, numRuns: 40 },
    )
  })

  it(`agrees with the oracle on every string up to length ${ENFA_MAX_LENGTH}, over random ε-NFAs`, SLOW, async () => {
    await fc.assert(
      fc.asyncProperty(enfaArb, (fa) => expectAgreement(fa, ENFA_MAX_LENGTH)),
      { seed: SEED, numRuns: 40 },
    )
  })
})

describe('trace invariants hold on machines nobody wrote down', () => {
  it.each([
    ['DFA', dfaArb],
    ['partial DFA', partialDfaArb],
    ['NFA', nfaArb],
    ['ε-NFA', enfaArb],
  ])('every %s trace satisfies all six invariants', (_label, arb) => {
    fc.assert(
      fc.property(arb, wordArb(6), (fa, word) => {
        const result = simulate(fa, word)
        expect(isOk(result)).toBe(true)
        if (!isOk(result)) return
        assertTraceInvariants(result.value as Trace)
      }),
      { seed: SEED, numRuns: 25 },
    )
  })
})

describe('determinism is a correctness property (§2.5)', () => {
  it.each([
    ['DFA', dfaArb],
    ['NFA', nfaArb],
    ['ε-NFA', enfaArb],
  ])('running the same %s on the same input twice is byte-identical', (_label, arb) => {
    fc.assert(
      fc.property(arb, wordArb(8), (fa, word) => {
        const a = simulate(fa, word)
        const b = simulate(fa, word)
        expect(isOk(a) && isOk(b)).toBe(true)
        if (!isOk(a) || !isOk(b)) return
        expect(JSON.stringify(b.value)).toBe(JSON.stringify(a.value))
      }),
      { seed: SEED, numRuns: 30 },
    )
  })
})

describe('serialisation round-trips whatever the engine produces', () => {
  it.each([
    ['DFA', dfaArb],
    ['NFA', nfaArb],
    ['ε-NFA', enfaArb],
  ])('a %s trace survives serialise / deserialise', (_label, arb) => {
    fc.assert(
      fc.property(arb, wordArb(6), (fa, word) => {
        const trace = unwrap(simulate(fa, word)) as Trace
        expect(deserialise(serialise(trace))).toEqual(trace)
      }),
      { seed: SEED, numRuns: 30 },
    )
  })

  it('a trace survives a plain JSON round-trip too', () => {
    fc.assert(
      fc.property(dfaArb, wordArb(6), (fa, word) => {
        const trace = unwrap(simulateDFA(fa, word))
        expect(JSON.parse(JSON.stringify(trace))).toEqual(trace)
      }),
      { seed: SEED, numRuns: 30 },
    )
  })
})
