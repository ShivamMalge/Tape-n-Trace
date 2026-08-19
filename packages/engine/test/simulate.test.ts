/**
 * Finite-automaton simulation — Hopcroft 2e §2.2, §2.3, §2.5.
 *
 * Worked examples and the shape of the traces they produce. The oracle
 * agreement and round-trip properties live in `properties.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import {
  epsilonClosure,
  isErr,
  isOk,
  simulate,
  simulateDFA,
  simulateENFA,
  simulateNFA,
  LIMITS,
  unwrap,
} from '../src/index.js'
import type { BranchNode, DFASnapshot, ENFASnapshot, FiniteAutomaton, NFASnapshot } from '../src/index.js'
import { bruteForceMembership } from './helpers/oracle.js'
import { assertSnapshotsFrozen, assertTraceInvariants } from './helpers/traceInvariants.js'
import {
  dfaContains01,
  dfaEmptyLanguage,
  enfaEpsilonCycle,
  enfaZerosThenOnes,
  nfaEndsIn01,
  partialDfaZeros,
  t,
} from './helpers/machines.js'

// ---------------------------------------------------------------------------

describe('simulateDFA — Hopcroft 2.2, strings containing 01', () => {
  it('accepts 0110', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '0110'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    assertTraceInvariants(trace)
  })

  it('rejects 1000', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '1000'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: false })
    assertTraceInvariants(trace)
  })

  it('emits one step per symbol, plus a start step and a verdict step', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '0110'))
    expect(trace.steps).toHaveLength(4 + 2)
    expect(trace.meta.counters['transitionsTaken']).toBe(4)
  })

  it('narrates the start and the verdict in exam language', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '0110'))
    expect(trace.steps[0]?.narration).toBe('Start in state q0 with "0110" still to read.')
    expect(trace.steps.at(-1)?.narration).toContain('which is an accepting state, so "0110" is accepted')
  })

  it('cites the extended transition function', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '01'))
    expect(trace.steps[0]?.citation).toBe('2.2.4')
    expect(trace.steps.at(-1)?.citation).toBe('2.2.5')
  })

  it('handles the empty string — start step, then the verdict', () => {
    const trace = unwrap(simulateDFA(dfaContains01, ''))
    expect(trace.steps).toHaveLength(2)
    expect(trace.steps[0]?.narration).toContain('the empty string')
    expect(trace.result).toEqual({ type: 'acceptance', accepted: false })
    assertTraceInvariants(trace)
  })

  it('accepts the empty string when the start state is accepting', () => {
    expect(unwrap(simulateDFA(partialDfaZeros, '')).result).toEqual({
      type: 'acceptance',
      accepted: true,
    })
  })

  it('freezes every snapshot (ADR-001)', () => {
    assertSnapshotsFrozen(unwrap(simulateDFA(dfaContains01, '0110')))
  })

  it('shares the machine across every step rather than copying it', () => {
    const trace = unwrap(simulateDFA(dfaContains01, '0110'))
    const first = trace.steps[0]?.snapshot as DFASnapshot
    for (const step of trace.steps) {
      expect((step.snapshot as DFASnapshot).machine).toBe(first.machine)
    }
  })

  it('does not freeze the caller’s machine', () => {
    unwrap(simulateDFA(dfaContains01, '0110'))
    expect(Object.isFrozen(dfaContains01)).toBe(false)
  })

  it('carries layout through without letting it touch semantics', () => {
    const positioned = { ...dfaContains01, layout: { q0: { x: 10, y: 20 } } }
    const trace = unwrap(simulateDFA(positioned, '0110'))
    const snapshot = trace.steps[0]?.snapshot as DFASnapshot

    expect(snapshot.machine.layout).toEqual({ q0: { x: 10, y: 20 } })
    // A defensive copy, so freezing the snapshot cannot freeze the editor's state.
    expect(snapshot.machine.layout).not.toBe(positioned.layout)
    expect(Object.isFrozen(positioned.layout)).toBe(false)

    // Same verdict, same steps, with or without coordinates.
    const plain = unwrap(simulateDFA(dfaContains01, '0110'))
    expect(trace.result).toEqual(plain.result)
    expect(trace.steps.map((s) => s.narration)).toEqual(plain.steps.map((s) => s.narration))
  })
})

describe('simulateDFA — an incomplete diagram', () => {
  it('rejects when no move exists, and says which move was missing', () => {
    const trace = unwrap(simulateDFA(partialDfaZeros, '01'))
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false })
    expect(trace.steps.at(-1)?.narration).toContain('has no transition on "1"')
    assertTraceInvariants(trace)
  })

  it('stops at the symbol it died on', () => {
    const trace = unwrap(simulateDFA(partialDfaZeros, '0100'))
    const last = trace.steps.at(-1)?.snapshot as DFASnapshot
    expect(last.position).toBe(1)
    expect(last.state).toBeNull()
    expect(last.status).toBe('rejected')
  })
})

describe('simulateDFA — user error is a Result, never an exception', () => {
  it('reports an input symbol outside the alphabet', () => {
    const result = simulateDFA(dfaContains01, '01x')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('INPUT_SYMBOL_NOT_IN_ALPHABET')
  })

  it('reports each offending symbol once', () => {
    const result = simulateDFA(dfaContains01, 'xxyy')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors).toHaveLength(2)
  })

  it('passes machine validation errors through', () => {
    const result = simulateDFA({ ...dfaContains01, start: 'nowhere' }, '0')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toContain('START_NOT_IN_STATES')
  })
})

// ---------------------------------------------------------------------------

describe('simulateNFA — Hopcroft 2.3, strings ending in 01', () => {
  it('accepts 0101', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0101'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    assertTraceInvariants(trace)
  })

  it('rejects 0100', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0100'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: false })
    assertTraceInvariants(trace)
  })

  /**
   * phases.md P0.1: "simulateNFA retains dead branches in its branch tree,
   * flagged dead at the step they died." This is the thing a blackboard cannot
   * show, so it is the thing most worth testing.
   */
  it('keeps dead branches in the tree, stamped with the step they died at', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0100'))
    const final = trace.steps.at(-1)?.snapshot as NFASnapshot
    const dead = final.nodes.filter((n) => n.status === 'dead')

    expect(dead.length).toBeGreaterThan(0)
    for (const node of dead) {
      expect(node.diedAtStep, `node ${node.id} is dead but carries no death step`).toBeTypeOf('number')
    }

    // The branch that guessed the 01 suffix too early reaches q2 and then has no
    // move on 0. It dies at step 3 and stays in the tree from then on.
    const strandedAtQ2 = final.nodes.find((n) => n.state === 'q2' && n.status === 'dead')
    expect(strandedAtQ2?.diedAtStep).toBe(3)
  })

  it('never removes a node once created — the tree only grows', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0100'))
    let previous = 0
    for (const step of trace.steps) {
      const count = (step.snapshot as NFASnapshot).nodes.length
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })

  it('marks the accepting branch at the end', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0101'))
    const final = trace.steps.at(-1)?.snapshot as NFASnapshot
    const accepting = final.nodes.filter((n: BranchNode) => n.status === 'accepting')
    expect(accepting).toHaveLength(1)
    expect(accepting[0]?.state).toBe('q2')
  })

  it('reuses unchanged node objects between steps (ADR-001)', () => {
    const trace = unwrap(simulateNFA(nfaEndsIn01, '0101'))
    const root0 = (trace.steps[0]?.snapshot as NFASnapshot).nodes[0]
    const root1 = (trace.steps[1]?.snapshot as NFASnapshot).nodes[0]
    expect(root1).toBe(root0)
  })

  it('gives up when every branch dies, and says so', () => {
    const trace = unwrap(simulateNFA({ ...nfaEndsIn01, transitions: [] }, '0'))
    expect(trace.result).toMatchObject({ accepted: false, note: expect.stringContaining('branch') })
    expect(trace.steps.at(-1)?.narration).toContain('every remaining branch dies')
    assertTraceInvariants(trace)
  })

  it('numbers nodes deterministically', () => {
    const a = unwrap(simulateNFA(nfaEndsIn01, '0101'))
    const b = unwrap(simulateNFA(nfaEndsIn01, '0101'))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('simulateNFA — the branch-tree guard (§9)', () => {
  /** Every state goes everywhere on every symbol, so the frontier is 4^n. */
  const explosive: FiniteAutomaton = {
    kind: 'NFA',
    states: ['q0', 'q1', 'q2', 'q3'],
    alphabet: ['0', '1'],
    transitions: ['q0', 'q1', 'q2', 'q3'].flatMap((from) =>
      ['0', '1'].flatMap((read) => ['q0', 'q1', 'q2', 'q3'].map((to) => t(from, read, to))),
    ),
    start: 'q0',
    accepting: ['q3'],
  }

  it('stops rather than exploding, and records the cap that fired', () => {
    const trace = unwrap(simulateNFA(explosive, '0000000'))
    expect(trace.meta.truncated?.cap).toBe(LIMITS.SIMULATION_STEPS)
    expect(trace.meta.truncated?.reason).toContain('branch tree')
  })

  /**
   * §2.6 and §9: a stopped run is reported as stopped, never as a rejection.
   * The string below *is* accepted — the machine accepts everything — so
   * reporting `accepted: false` here would be actively wrong, not merely coy.
   */
  it('reports an incomplete verdict, not a rejection', () => {
    const trace = unwrap(simulateNFA(explosive, '0000000'))
    expect(trace.result.type).toBe('incomplete')
    if (trace.result.type !== 'incomplete') return
    expect(trace.result.bounded).toEqual({ searchedUpTo: expect.any(Number), unit: 'inputLength' })
    expect(bruteForceMembership(explosive, '0000000')).toBe(true)
  })

  it('says so in the narration as well as in meta — a silent cap is a defect', () => {
    const trace = unwrap(simulateNFA(explosive, '0000000'))
    expect(trace.steps.at(-1)?.narration).toContain('without a verdict')
    expect((trace.steps.at(-1)?.snapshot as NFASnapshot).status).toBe('stopped')
  })

  it('still satisfies every trace invariant', () => {
    assertTraceInvariants(unwrap(simulateNFA(explosive, '0000000')))
  })
})

// ---------------------------------------------------------------------------

describe('epsilonClosure — Hopcroft 2.5.3', () => {
  it('includes the states it started from', () => {
    expect(epsilonClosure(enfaZerosThenOnes, ['B'])).toEqual(['B'])
  })

  it('follows ε-transitions transitively', () => {
    expect(epsilonClosure(enfaZerosThenOnes, ['A'])).toEqual(['A', 'B'])
  })

  it('terminates on an ε-cycle', () => {
    expect(epsilonClosure(enfaEpsilonCycle, ['A'])).toEqual(['A', 'B'])
    expect(epsilonClosure(enfaEpsilonCycle, ['B'])).toEqual(['A', 'B'])
  })

  it('returns a canonically sorted set, whatever order it was given', () => {
    expect(epsilonClosure(enfaEpsilonCycle, ['B', 'A'])).toEqual(
      epsilonClosure(enfaEpsilonCycle, ['A', 'B']),
    )
  })

  it('is the identity on a machine with no ε-transitions', () => {
    expect(epsilonClosure(dfaContains01, ['q1'])).toEqual(['q1'])
  })
})

describe('simulateENFA — Hopcroft 2.5, the language 0*1*', () => {
  it('accepts the empty string, because the ε-closure of the start state is accepting', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, ''))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    assertTraceInvariants(trace)
  })

  it('accepts 0011', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '0011'))
    expect(trace.result).toEqual({ type: 'acceptance', accepted: true })
    assertTraceInvariants(trace)
  })

  it('rejects 10, since a 0 can never follow a 1', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '10'))
    expect(trace.result).toMatchObject({ type: 'acceptance', accepted: false })
    assertTraceInvariants(trace)
  })

  it('makes the ε-closure a step of its own — the half students forget', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '01'))
    const phases = trace.steps.map((s) => (s.snapshot as ENFASnapshot).phase)
    expect(phases).toEqual(['start', 'closure', 'read', 'closure', 'read', 'closure', 'final'])
  })

  it('narrates a closure that widens the set differently from one that does not', () => {
    // Reading 0 lands in {A}, whose closure reaches B as well.
    const widens = unwrap(simulateENFA(enfaZerosThenOnes, '0'))
    expect(widens.steps[3]?.narration).toContain('widens the set')

    // Reading 1 lands in {B}, which has no ε-transition out of it.
    const stays = unwrap(simulateENFA(enfaZerosThenOnes, '1'))
    expect(stays.steps[3]?.narration).toContain('adds nothing')
  })

  it('narrates the opening closure as the one taken before anything is read', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '0'))
    expect(trace.steps[1]?.narration).toContain('before reading anything')
  })

  it('cites the closure section on closure steps', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '0'))
    expect(trace.steps[1]?.citation).toBe('2.5.3')
  })

  it('counts the closures it took', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '01'))
    expect(trace.meta.counters['closuresTaken']).toBe(3)
  })

  it('reports the set it was stuck in when no move exists', () => {
    const trace = unwrap(simulateENFA(enfaZerosThenOnes, '10'))
    expect(trace.steps.at(-1)?.narration).toContain('No state in {B}')
  })
})

// ---------------------------------------------------------------------------

describe('simulate — the dispatcher', () => {
  it.each([
    ['DFA', dfaContains01, '0110', 'simulate.dfa'],
    ['NFA', nfaEndsIn01, '0101', 'simulate.nfa'],
    ['ENFA', enfaZerosThenOnes, '0011', 'simulate.enfa'],
  ])('routes a %s to its own simulator', (_label, fa, input, kind) => {
    const trace = unwrap(simulate(fa, input))
    expect(trace.kind).toBe(kind)
  })

  it('agrees with the oracle on the fixtures', () => {
    const cases: [typeof dfaContains01, string][] = [
      [dfaContains01, '0110'],
      [dfaContains01, '1000'],
      [nfaEndsIn01, '0101'],
      [nfaEndsIn01, '0100'],
      [enfaZerosThenOnes, ''],
      [enfaZerosThenOnes, '0011'],
      [enfaZerosThenOnes, '10'],
      [dfaEmptyLanguage, '0101'],
      [partialDfaZeros, '000'],
    ]

    for (const [fa, input] of cases) {
      const result = simulate(fa, input)
      expect(isOk(result)).toBe(true)
      if (!isOk(result)) continue
      const accepted = result.value.result.type === 'acceptance' && result.value.result.accepted
      expect(accepted, `${fa.kind} on "${input}"`).toBe(bruteForceMembership(fa, input))
    }
  })

  it('accepts an array of symbols as well as a string', () => {
    const fromString = unwrap(simulate(dfaContains01, '0110'))
    const fromArray = unwrap(simulate(dfaContains01, ['0', '1', '1', '0']))
    expect(JSON.stringify(fromArray)).toBe(JSON.stringify(fromString))
  })
})
