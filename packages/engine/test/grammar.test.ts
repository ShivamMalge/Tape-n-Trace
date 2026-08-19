/**
 * Regular grammars and automata.
 *
 * The correspondence is only worth anything if it survives a round trip in both
 * directions, so that is what is checked: grammar → NFA → grammar, and
 * NFA → grammar → NFA, both compared as languages rather than as text.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  areEquivalent,
  checkRightLinear,
  epsilonElim,
  grammarToNFA,
  isErr,
  minimize,
  nfaToDfa,
  nfaToGrammar,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { CFG, FiniteAutomaton, Trace } from '../src/index.js'
import { nfaArb } from './helpers/arbitraries.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { SEED } from './helpers/seed.js'
import { nfaEndsIn01 } from './helpers/machines.js'

function machineOf(trace: Trace): FiniteAutomaton {
  if (trace.result.type !== 'machine') throw new Error('expected a machine')
  return trace.result.machine as FiniteAutomaton
}

function grammarOf(trace: Trace): CFG {
  if (trace.result.type !== 'grammar') throw new Error('expected a grammar')
  return trace.result.grammar
}

/** The minimal DFA of a machine, so two machines compare as languages. */
function canonical(fa: FiniteAutomaton): FiniteAutomaton {
  const free = fa.kind === 'ENFA' ? machineOf(unwrap(epsilonElim(fa))) : fa
  return machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(free))))))
}

/** Strings over {0,1} ending in 01, as a right-linear grammar. */
const endsIn01: CFG = {
  variables: ['S', 'A', 'B'],
  terminals: ['0', '1'],
  productions: [
    { head: 'S', body: ['0', 'S'] },
    { head: 'S', body: ['1', 'S'] },
    { head: 'S', body: ['0', 'A'] },
    { head: 'A', body: ['1', 'B'] },
    { head: 'B', body: [] },
  ],
  start: 'S',
}

describe('grammarToNFA', () => {
  it('turns each production into the move it describes', () => {
    const trace = unwrap(grammarToNFA(endsIn01))
    const machine = machineOf(trace)

    expect(validateFA(machine).ok).toBe(true)
    expect(machine.start).toBe('S')
    expect(machine.accepting).toContain('B')
    expect(areEquivalent(canonical(machine), canonical(nfaEndsIn01))).toBe(true)
    assertTraceInvariants(trace)
  })

  it('emits one step per production, plus an opening and a summary', () => {
    const trace = unwrap(grammarToNFA(endsIn01))
    expect(trace.steps).toHaveLength(endsIn01.productions.length + 2)
  })

  it('sends a terminal-only production to a single accepting state', () => {
    const grammar: CFG = {
      variables: ['S'],
      terminals: ['0'],
      productions: [{ head: 'S', body: ['0'] }],
      start: 'S',
    }
    const machine = machineOf(unwrap(grammarToNFA(grammar)))
    expect(machine.states).toHaveLength(2)
    expect(machine.accepting).toHaveLength(1)
    expect(machine.accepting[0]).not.toBe('S')
  })

  it('makes a unit production an ε-transition, and the machine an ε-NFA', () => {
    const grammar: CFG = {
      variables: ['S', 'T'],
      terminals: ['0'],
      productions: [
        { head: 'S', body: ['T'] },
        { head: 'T', body: [] },
      ],
      start: 'S',
    }
    const machine = machineOf(unwrap(grammarToNFA(grammar)))
    expect(machine.kind).toBe('ENFA')
    expect(machine.transitions[0]?.read).toBeNull()
  })

  it('reports every production that is not right-linear, not just the first', () => {
    const bad: CFG = {
      variables: ['S'],
      terminals: ['0', '1'],
      productions: [
        { head: 'S', body: ['S', '0'] }, // left-linear
        { head: 'S', body: ['0', '1', 'S'] }, // two terminals
        { head: 'X', body: ['0'] }, // unknown head
      ],
      start: 'S',
    }

    const result = grammarToNFA(bad)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors).toHaveLength(3)
    expect(result.errors.map((e) => e.code)).toContain('NOT_RIGHT_LINEAR')
    expect(result.errors.map((e) => e.code)).toContain('PRODUCTION_HEAD_NOT_A_VARIABLE')
  })

  it('rejects a start symbol that is not a variable', () => {
    const codes = checkRightLinear({ ...endsIn01, start: 'Z' }).map((e) => e.code)
    expect(codes).toContain('START_NOT_A_VARIABLE')
  })
})

describe('nfaToGrammar', () => {
  it('turns each move into the production it describes', () => {
    const trace = unwrap(nfaToGrammar(nfaEndsIn01))
    const grammar = grammarOf(trace)

    expect(grammar.start).toBe(nfaEndsIn01.start)
    expect(checkRightLinear(grammar)).toEqual([])
    assertTraceInvariants(trace)
  })

  it('emits one step per transition and per accepting state', () => {
    const trace = unwrap(nfaToGrammar(nfaEndsIn01))
    const expected = nfaEndsIn01.transitions.length + nfaEndsIn01.accepting.length + 2
    expect(trace.steps).toHaveLength(expected)
  })
})

describe('the correspondence survives a round trip', () => {
  it('grammar → NFA → grammar → NFA gives the same language', () => {
    const first = machineOf(unwrap(grammarToNFA(endsIn01)))
    const back = grammarOf(unwrap(nfaToGrammar(first)))
    const second = machineOf(unwrap(grammarToNFA(back)))
    expect(areEquivalent(canonical(first), canonical(second))).toBe(true)
  })

  it('NFA → grammar → NFA gives the same language, for random NFAs', () => {
    fc.assert(
      fc.property(nfaArb, (nfa) => {
        const grammar = grammarOf(unwrap(nfaToGrammar(nfa)))
        expect(checkRightLinear(grammar)).toEqual([])
        const back = machineOf(unwrap(grammarToNFA(grammar)))
        expect(areEquivalent(canonical(nfa), canonical(back))).toBe(true)
      }),
      { seed: SEED, numRuns: 80 },
    )
  })
})
