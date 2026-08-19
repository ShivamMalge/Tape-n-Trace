/**
 * The grand round-trip — phases.md P0.3, the exit gate.
 *
 *   NFA ─subset→ DFA ─minimise→ DFA ─state elimination→ RE
 *       ─Thompson→ ε-NFA ─ε-elimination→ NFA ─subset→ DFA ─minimise→ DFA
 *
 * and the DFA that comes out the far end must accept exactly the language the
 * NFA went in with. Six conversions in a chain, each one's output the next one's
 * input: a bug anywhere shows up here, and almost nowhere is it possible for two
 * bugs to cancel out across constructions this different.
 *
 * "Bounds are mandatory" — 4 states and 2 symbols. State elimination grows the
 * expression super-exponentially, so a fifth state is not a slightly longer test
 * but a different order of magnitude.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  areEquivalent,
  dfaToRegex,
  epsilonElim,
  minimize,
  nfaToDfa,
  regexSize,
  regexToENFA,
  regexToString,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton, RegexNode, Trace } from '../src/index.js'
import { dfaArb, enfaArb, nfaArb } from './helpers/arbitraries.js'
import { RUNS, SEED } from './helpers/seed.js'
import { nfaEndsIn01 } from './helpers/machines.js'

const SLOW = { timeout: 300_000 }

function machineOf(trace: Trace): FiniteAutomaton {
  if (trace.result.type !== 'machine') throw new Error(`expected a machine, got ${trace.result.type}`)
  return trace.result.machine as FiniteAutomaton
}

function regexOf(trace: Trace): RegexNode {
  if (trace.result.type !== 'regex') throw new Error(`expected a regex, got ${trace.result.type}`)
  return trace.result.regex
}

/** Each stage's output, kept so a failure can say *where* the language changed. */
export interface RoundTrip {
  determinised: FiniteAutomaton
  minimal: FiniteAutomaton
  regex: RegexNode
  thompson: FiniteAutomaton
  epsilonFree: FiniteAutomaton
  redetermined: FiniteAutomaton
  final: FiniteAutomaton
}

function roundTrip(nfa: FiniteAutomaton): RoundTrip {
  const determinised = machineOf(unwrap(nfaToDfa(nfa)))
  const minimal = machineOf(unwrap(minimize(determinised)))
  const regex = regexOf(unwrap(dfaToRegex(minimal)))
  const thompson = machineOf(unwrap(regexToENFA(regex, nfa.alphabet)))
  const epsilonFree = machineOf(unwrap(epsilonElim(thompson)))
  const redetermined = machineOf(unwrap(nfaToDfa(epsilonFree)))
  const final = machineOf(unwrap(minimize(redetermined)))

  return { determinised, minimal, regex, thompson, epsilonFree, redetermined, final }
}

describe('the grand round-trip', () => {
  it('survives the whole chain on the textbook NFA', () => {
    const trip = roundTrip(nfaEndsIn01)

    for (const [stage, machine] of Object.entries(trip)) {
      if (stage === 'regex') continue
      expect(validateFA(machine as FiniteAutomaton).ok, `${stage} produced an invalid machine`).toBe(true)
    }

    expect(areEquivalent(trip.minimal, trip.final)).toBe(true)
    // Minimal DFAs of the same language are isomorphic, so the state counts match.
    expect(trip.final.states.length).toBe(trip.minimal.states.length)
  })

  /**
   * The exit gate. Equivalence is checked against the *minimised* DFA of the
   * original rather than the NFA itself, because the product construction is
   * defined on DFAs — determinising is the first link in the chain either way.
   */
  it(`holds for ${RUNS} random NFAs, bounded to 4 states and 2 symbols`, SLOW, () => {
    fc.assert(
      fc.property(nfaArb, (nfa) => {
        const trip = roundTrip(nfa)
        expect(
          areEquivalent(trip.minimal, trip.final),
          `the language changed somewhere in the chain.\nNFA: ${JSON.stringify(nfa)}\nRE: ${regexToString(trip.regex)}`,
        ).toBe(true)
      }),
      { seed: SEED, numRuns: RUNS },
    )
  })

  it('holds for random ε-NFAs, which enter the chain one link earlier', SLOW, () => {
    fc.assert(
      fc.property(enfaArb, (enfa) => {
        const start = machineOf(unwrap(epsilonElim(enfa)))
        const trip = roundTrip(start)
        expect(areEquivalent(trip.minimal, trip.final)).toBe(true)
      }),
      { seed: SEED, numRuns: 100 },
    )
  })

  it('holds for random DFAs', SLOW, () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const trip = roundTrip(dfa)
        expect(areEquivalent(trip.minimal, trip.final)).toBe(true)
      }),
      { seed: SEED, numRuns: 100 },
    )
  })
})

describe('each link, so a round-trip failure can be located', () => {
  const stages: [string, (m: FiniteAutomaton) => FiniteAutomaton][] = [
    ['subset construction', (m) => machineOf(unwrap(nfaToDfa(m)))],
    ['minimisation', (m) => machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(m))))))],
    [
      'state elimination then Thompson',
      (m) => {
        const minimal = machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(m))))))
        const re = regexOf(unwrap(dfaToRegex(minimal)))
        return machineOf(unwrap(regexToENFA(re, m.alphabet)))
      },
    ],
  ]

  it.each(stages)('%s preserves the language', (_label, convert) => {
    fc.assert(
      fc.property(nfaArb, (nfa) => {
        const before = machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(nfa))))))
        const converted = convert(nfa)
        const after = machineOf(
          unwrap(
            minimize(
              machineOf(
                unwrap(nfaToDfa(converted.kind === 'ENFA' ? machineOf(unwrap(epsilonElim(converted))) : converted)),
              ),
            ),
          ),
        )
        expect(areEquivalent(before, after)).toBe(true)
      }),
      { seed: SEED, numRuns: 60 },
    )
  })
})

describe('the expression state elimination produces', () => {
  it('stays small enough to read, thanks to the simplifying identities', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const minimal = machineOf(unwrap(minimize(dfa)))
        const regex = regexOf(unwrap(dfaToRegex(minimal)))
        // Without ∅/ε simplification a 5-state machine routinely passes a
        // thousand nodes; with it, a handful of dozens.
        expect(regexSize(regex), regexToString(regex)).toBeLessThan(400)
      }),
      { seed: SEED, numRuns: 60 },
    )
  })

  it('is reproducible — the same DFA gives byte-identical output', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const first = unwrap(dfaToRegex(dfa))
        const second = unwrap(dfaToRegex(dfa))
        expect(JSON.stringify(second)).toBe(JSON.stringify(first))
      }),
      { seed: SEED, numRuns: 40 },
    )
  })
})
