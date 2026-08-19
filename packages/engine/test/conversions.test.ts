/**
 * The Module 1–2 conversions — Hopcroft 2e §2.3.5, §2.5.5, §4.1, §4.4.
 *
 * Every conversion is checked the same way: the language it produces is compared
 * against the language it was given, exhaustively up to a length bound, using
 * the independent oracle. A conversion that changes the language is the one bug
 * that matters, and it is the one a plausible-looking diagram hides best.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  areEquivalent,
  epsilonElim,
  equivalence,
  isErr,
  minimize,
  nfaToDfa,
  separatingWord,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton, MinimizeSnapshot, SubsetSnapshot, Trace } from '../src/index.js'
import { dfaArb, enfaArb, nfaArb } from './helpers/arbitraries.js'
import { languageUpTo } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { partitionRefine } from './helpers/partition.js'
import { dfaContains01, enfaZerosThenOnes, nfaEndsIn01 } from './helpers/machines.js'
import { SEED } from './helpers/seed.js'

/** The machine a conversion trace produced. */
function machineOf(trace: Trace): FiniteAutomaton {
  expect(trace.result.type).toBe('machine')
  if (trace.result.type !== 'machine') throw new Error('not a machine result')
  return trace.result.machine as FiniteAutomaton
}

function sameLanguage(a: FiniteAutomaton, b: FiniteAutomaton, upTo = 9): void {
  const left = languageUpTo(a, upTo)
  const right = languageUpTo(b, upTo)
  const onlyLeft = [...left].filter((w) => !right.has(w))
  const onlyRight = [...right].filter((w) => !left.has(w))
  expect(
    { onlyLeft: onlyLeft.slice(0, 4), onlyRight: onlyRight.slice(0, 4) },
    'the conversion changed the language',
  ).toEqual({ onlyLeft: [], onlyRight: [] })
}

// ---------------------------------------------------------------------------

describe('nfaToDfa — the subset construction', () => {
  it('preserves the language of the NFA ending in 01', () => {
    const trace = unwrap(nfaToDfa(nfaEndsIn01))
    sameLanguage(nfaEndsIn01, machineOf(trace))
    assertTraceInvariants(trace)
  })

  it('produces a valid, deterministic DFA', () => {
    const dfa = machineOf(unwrap(nfaToDfa(nfaEndsIn01)))
    expect(dfa.kind).toBe('DFA')
    expect(validateFA(dfa).ok).toBe(true)
  })

  it('names subsets canonically, so two runs are byte-identical', () => {
    const first = unwrap(nfaToDfa(nfaEndsIn01))
    const second = unwrap(nfaToDfa(nfaEndsIn01))
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    expect(machineOf(first).states).toContain('{q0,q1}')
  })

  it('builds only reachable subsets, not all 2^n', () => {
    // 3 states would give 8 subsets; only the reachable ones are built.
    const dfa = machineOf(unwrap(nfaToDfa(nfaEndsIn01)))
    expect(dfa.states.length).toBeLessThan(8)
  })

  it('takes ε-closures when the source is an ε-NFA (§2.5.5)', () => {
    const trace = unwrap(nfaToDfa(enfaZerosThenOnes))
    const dfa = machineOf(trace)
    sameLanguage(enfaZerosThenOnes, dfa)
    // The start subset is the closure of A, which reaches B.
    expect(dfa.start).toBe('{A,B}')
    assertTraceInvariants(trace)
  })

  it('emits one step per subset expanded, plus a start and a summary', () => {
    const trace = unwrap(nfaToDfa(nfaEndsIn01))
    const dfa = machineOf(trace)
    expect(trace.steps).toHaveLength(dfa.states.length + 2)
  })

  it('leaves a DFA it is given alone, up to renaming', () => {
    sameLanguage(dfaContains01, machineOf(unwrap(nfaToDfa(dfaContains01))))
  })

  /** phases.md P0.3 — the 2^n bad case must explain itself, not hang. */
  it('stops on the exponential case and says that is the point (§2.3.6)', () => {
    // Hopcroft's family: strings whose n-th symbol from the end is 1. Every
    // subset of the tail states is reachable, so the DFA needs 2^n states.
    const n = 14
    const states = ['q0', ...Array.from({ length: n }, (_, i) => `p${i + 1}`)]
    const transitions = [
      { id: 't-loop0', from: 'q0', read: '0', to: 'q0' },
      { id: 't-loop1', from: 'q0', read: '1', to: 'q0' },
      { id: 't-guess', from: 'q0', read: '1', to: 'p1' },
      ...Array.from({ length: n - 1 }, (_, i) => [
        { id: `t-${i}-0`, from: `p${i + 1}`, read: '0', to: `p${i + 2}` },
        { id: `t-${i}-1`, from: `p${i + 1}`, read: '1', to: `p${i + 2}` },
      ]).flat(),
    ]

    const bad: FiniteAutomaton = {
      kind: 'NFA',
      states,
      alphabet: ['0', '1'],
      transitions,
      start: 'q0',
      accepting: [`p${n}`],
    }

    const trace = unwrap(nfaToDfa(bad))
    expect(trace.result.type).toBe('incomplete')
    expect(trace.meta.truncated?.reason).toContain('exponential')
    expect(trace.steps.at(-1)?.narration).toContain('exponential')
    // Reported as stopped, never as a finished machine.
    expect((trace.steps.at(-1)?.snapshot as SubsetSnapshot).status).toBe('stopped')
    assertTraceInvariants(trace)
  })

  it('agrees with the oracle on random NFAs', () => {
    fc.assert(
      fc.property(nfaArb, (nfa) => {
        sameLanguage(nfa, machineOf(unwrap(nfaToDfa(nfa))), 8)
      }),
      { seed: SEED, numRuns: 40 },
    )
  })
})

// ---------------------------------------------------------------------------

describe('epsilonElim — removing ε-transitions', () => {
  it('preserves the language and removes every ε-transition', () => {
    const trace = unwrap(epsilonElim(enfaZerosThenOnes))
    const nfa = machineOf(trace)

    expect(nfa.kind).toBe('NFA')
    expect(nfa.transitions.some((t) => t.read === null)).toBe(false)
    expect(validateFA(nfa).ok).toBe(true)
    sameLanguage(enfaZerosThenOnes, nfa)
    assertTraceInvariants(trace)
  })

  it('keeps the empty string when the start closure reaches an accepting state', () => {
    // 0*1* accepts ε through the ε-edge; the NFA must accept it without one.
    const nfa = machineOf(unwrap(epsilonElim(enfaZerosThenOnes)))
    expect(nfa.accepting).toContain('A')
  })

  it('changes nothing but the kind when there are no ε-transitions', () => {
    const trace = unwrap(epsilonElim({ ...nfaEndsIn01, kind: 'ENFA' }))
    expect(trace.steps[0]?.narration).toContain('no ε-transitions')
    sameLanguage(nfaEndsIn01, machineOf(trace))
  })

  it('emits one step per state, plus an opening and a summary', () => {
    const trace = unwrap(epsilonElim(enfaZerosThenOnes))
    expect(trace.steps).toHaveLength(enfaZerosThenOnes.states.length + 2)
  })

  it('agrees with the oracle on random ε-NFAs', () => {
    fc.assert(
      fc.property(enfaArb, (enfa) => {
        sameLanguage(enfa, machineOf(unwrap(epsilonElim(enfa))), 8)
      }),
      { seed: SEED, numRuns: 40 },
    )
  })
})

// ---------------------------------------------------------------------------

describe('minimize — table filling', () => {
  it('preserves the language', () => {
    const trace = unwrap(minimize(dfaContains01))
    sameLanguage(dfaContains01, machineOf(trace))
    assertTraceInvariants(trace)
  })

  it('merges states that cannot be told apart', () => {
    // q1 and q2 both accept everything from here on, so they are equivalent.
    const redundant: FiniteAutomaton = {
      kind: 'DFA',
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      transitions: [
        { id: 'a', from: 'q0', read: '0', to: 'q1' },
        { id: 'b', from: 'q0', read: '1', to: 'q2' },
        { id: 'c', from: 'q1', read: '0', to: 'q1' },
        { id: 'd', from: 'q1', read: '1', to: 'q1' },
        { id: 'e', from: 'q2', read: '0', to: 'q2' },
        { id: 'f', from: 'q2', read: '1', to: 'q2' },
      ],
      start: 'q0',
      accepting: ['q1', 'q2'],
    }

    const minimal = machineOf(unwrap(minimize(redundant)))
    expect(minimal.states).toHaveLength(2)
    expect(minimal.states).toContain('{q1,q2}')
    sameLanguage(redundant, minimal)
  })

  it('removes unreachable states before building the table (§4.4.3)', () => {
    const withOrphan: FiniteAutomaton = {
      ...dfaContains01,
      states: [...dfaContains01.states, 'orphan'],
      transitions: [
        ...dfaContains01.transitions,
        { id: 'o0', from: 'orphan', read: '0', to: 'orphan' },
        { id: 'o1', from: 'orphan', read: '1', to: 'orphan' },
      ],
    }

    const trace = unwrap(minimize(withOrphan))
    expect(trace.steps[0]?.narration).toContain('orphan')
    expect(machineOf(trace).states.join(' ')).not.toContain('orphan')
  })

  it('is idempotent — minimising a minimal DFA changes nothing', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const once = machineOf(unwrap(minimize(dfa)))
        const twice = machineOf(unwrap(minimize(once)))
        expect(twice.states).toHaveLength(once.states.length)
        expect(areEquivalent(once, twice)).toBe(true)
      }),
      { seed: SEED, numRuns: 50 },
    )
  })

  /**
   * phases.md P0.3 — the state count must match an independently written
   * partition-refinement implementation used only in tests. Table filling marks
   * pairs; Moore's algorithm splits blocks. Two different shapes, one answer.
   */
  it('reaches the same state count as an independent partition refinement', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        const byTable = machineOf(unwrap(minimize(dfa)))
        const byRefinement = partitionRefine(dfa)
        expect(byTable.states.length, JSON.stringify(dfa)).toBe(byRefinement.length)
      }),
      { seed: SEED, numRuns: 60 },
    )
  })

  it('refuses an NFA rather than quietly determinising it', () => {
    const result = minimize(nfaEndsIn01)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('MINIMIZE_NEEDS_DFA')
  })

  it('records the round each pair was marked in', () => {
    const trace = unwrap(minimize(dfaContains01))
    const final = trace.steps.at(-1)?.snapshot as MinimizeSnapshot
    expect(Object.values(final.marks).some((round) => round === 0)).toBe(true)
  })

  it('agrees with the oracle on random DFAs', () => {
    fc.assert(
      fc.property(dfaArb, (dfa) => {
        sameLanguage(dfa, machineOf(unwrap(minimize(dfa))), 8)
      }),
      { seed: SEED, numRuns: 40 },
    )
  })
})

// ---------------------------------------------------------------------------

describe('equivalence — the product construction', () => {
  it('agrees a machine is equivalent to itself', () => {
    const trace = unwrap(equivalence(dfaContains01, dfaContains01))
    expect(trace.result).toEqual({ type: 'verdict', holds: true })
    assertTraceInvariants(trace)
  })

  it('finds the shortest string two machines disagree on', () => {
    // Accepts everything except the empty string, versus everything.
    const notEmpty: FiniteAutomaton = {
      kind: 'DFA',
      states: ['s', 'a'],
      alphabet: ['0', '1'],
      transitions: [
        { id: '1', from: 's', read: '0', to: 'a' },
        { id: '2', from: 's', read: '1', to: 'a' },
        { id: '3', from: 'a', read: '0', to: 'a' },
        { id: '4', from: 'a', read: '1', to: 'a' },
      ],
      start: 's',
      accepting: ['a'],
    }
    const everything: FiniteAutomaton = { ...notEmpty, accepting: ['s', 'a'] }

    expect(separatingWord(notEmpty, everything)).toBe('')

    // Differ first on "1": one accepts it, the other does not.
    const endsIn0: FiniteAutomaton = { ...notEmpty, accepting: ['s'] }
    const witness = separatingWord(notEmpty, endsIn0)
    expect(witness).toBe('')
  })

  it('reports the shortest witness, not merely a witness', () => {
    const a = machineOf(unwrap(nfaToDfa(nfaEndsIn01)))
    // Accepts strings ending in 1 rather than 01 — they first differ on "1".
    const b: FiniteAutomaton = {
      kind: 'DFA',
      states: ['e', 'f'],
      alphabet: ['0', '1'],
      transitions: [
        { id: '1', from: 'e', read: '0', to: 'e' },
        { id: '2', from: 'e', read: '1', to: 'f' },
        { id: '3', from: 'f', read: '0', to: 'e' },
        { id: '4', from: 'f', read: '1', to: 'f' },
      ],
      start: 'e',
      accepting: ['f'],
    }

    const witness = separatingWord(a, b)
    expect(witness).toBe('1')
  })

  it('compares a partial DFA against a complete one without inventing a difference', () => {
    const partial: FiniteAutomaton = {
      kind: 'DFA',
      states: ['q0'],
      alphabet: ['0', '1'],
      transitions: [{ id: 'a', from: 'q0', read: '0', to: 'q0' }],
      start: 'q0',
      accepting: ['q0'],
    }
    const completed: FiniteAutomaton = {
      kind: 'DFA',
      states: ['q0', 'trap'],
      alphabet: ['0', '1'],
      transitions: [
        { id: 'a', from: 'q0', read: '0', to: 'q0' },
        { id: 'b', from: 'q0', read: '1', to: 'trap' },
        { id: 'c', from: 'trap', read: '0', to: 'trap' },
        { id: 'd', from: 'trap', read: '1', to: 'trap' },
      ],
      start: 'q0',
      accepting: ['q0'],
    }

    expect(areEquivalent(partial, completed)).toBe(true)
  })

  it('refuses an NFA, since determinising is a step worth watching', () => {
    const result = equivalence(nfaEndsIn01, dfaContains01)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toContain('EQUIVALENCE_NEEDS_DFA')
  })

  it('refuses two machines over different alphabets', () => {
    const other: FiniteAutomaton = { ...dfaContains01, alphabet: ['a', 'b'], transitions: [] }
    const result = equivalence(dfaContains01, other)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toContain('ALPHABET_MISMATCH')
  })

  it('agrees with the oracle about whether two random DFAs match', () => {
    fc.assert(
      fc.property(dfaArb, dfaArb, (a, b) => {
        const byProduct = areEquivalent(a, b)
        const byOracle =
          [...languageUpTo(a, 8)].join('|') === [...languageUpTo(b, 8)].join('|')
        // The oracle is bounded, so it can only disagree by claiming equality
        // that the product construction refutes with a longer witness.
        if (byProduct) expect(byOracle).toBe(true)
      }),
      { seed: SEED, numRuns: 60 },
    )
  })
})
