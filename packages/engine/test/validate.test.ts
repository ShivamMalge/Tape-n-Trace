/**
 * Machine validation — architecture.md §4.
 *
 * The point of this module is not that it rejects bad machines; it is that it
 * reports *every* problem at once, because the editor draws all of them.
 */

import { describe, expect, it } from 'vitest'
import { completeDFA, isComplete, isErr, validateFA } from '../src/index.js'
import type { FiniteAutomaton, ValidationError } from '../src/index.js'
import { dfaContains01, enfaZerosThenOnes, nfaEndsIn01, partialDfaZeros, t } from './helpers/machines.js'

function codesOf(fa: FiniteAutomaton): string[] {
  const result = validateFA(fa)
  return isErr(result) ? result.errors.map((e: ValidationError) => e.code) : []
}

describe('validateFA — machines that are fine', () => {
  it.each([
    ['a complete DFA', dfaContains01],
    ['an NFA', nfaEndsIn01],
    ['an ε-NFA', enfaZerosThenOnes],
    ['an incomplete DFA', partialDfaZeros],
  ])('accepts %s', (_label, fa) => {
    expect(validateFA(fa)).toEqual({ ok: true, value: fa })
  })
})

describe('validateFA — structure', () => {
  it('rejects an automaton with no states', () => {
    expect(codesOf({ ...dfaContains01, states: [], transitions: [], accepting: [] })).toContain(
      'EMPTY_STATE_SET',
    )
  })

  it('reports a duplicated state once', () => {
    const codes = codesOf({ ...dfaContains01, states: ['q0', 'q1', 'q2', 'q1'] })
    expect(codes.filter((c) => c === 'DUPLICATE_STATE')).toHaveLength(1)
  })

  it('rejects a start state that is not a state', () => {
    expect(codesOf({ ...dfaContains01, start: 'nowhere' })).toContain('START_NOT_IN_STATES')
  })

  it('rejects an accepting state that is not a state', () => {
    expect(codesOf({ ...dfaContains01, accepting: ['q2', 'ghost'] })).toContain(
      'ACCEPTING_NOT_IN_STATES',
    )
  })

  it('rejects an unnamed state — every state needs a label the student can read', () => {
    const fa = { ...dfaContains01, states: ['q0', 'q1', 'q2', ''] }
    expect(codesOf(fa)).toContain('EMPTY_STATE_NAME')
  })

  it('rejects the empty string as an alphabet symbol', () => {
    expect(codesOf({ ...dfaContains01, alphabet: ['0', '1', ''] })).toContain('EMPTY_SYMBOL')
  })

  it('rejects a duplicated alphabet symbol', () => {
    expect(codesOf({ ...dfaContains01, alphabet: ['0', '1', '0'] })).toContain('DUPLICATE_SYMBOL')
  })
})

describe('validateFA — transitions', () => {
  it('rejects a transition leaving an unknown state', () => {
    const fa = { ...dfaContains01, transitions: [...dfaContains01.transitions, t('ghost', '0', 'q0')] }
    expect(codesOf(fa)).toContain('TRANSITION_FROM_UNKNOWN_STATE')
  })

  it('rejects a transition entering an unknown state', () => {
    const fa = { ...dfaContains01, transitions: [...dfaContains01.transitions, t('q2', '0', 'ghost')] }
    expect(codesOf(fa)).toContain('TRANSITION_TO_UNKNOWN_STATE')
  })

  it('rejects a symbol outside the alphabet', () => {
    const fa = { ...dfaContains01, transitions: [...dfaContains01.transitions, t('q0', 'x', 'q1')] }
    expect(codesOf(fa)).toContain('SYMBOL_NOT_IN_ALPHABET')
  })

  it('rejects duplicate transition ids', () => {
    const fa = {
      ...dfaContains01,
      transitions: [...dfaContains01.transitions, { ...t('q0', '0', 'q1'), to: 'q2' }],
    }
    expect(codesOf(fa)).toContain('DUPLICATE_TRANSITION_ID')
  })

  it('rejects an ε-transition on a DFA or an NFA (ADR-002)', () => {
    expect(codesOf({ ...dfaContains01, transitions: [t('q0', null, 'q1')] })).toContain(
      'EPSILON_NOT_ALLOWED',
    )
    expect(codesOf({ ...nfaEndsIn01, transitions: [t('q0', null, 'q1')] })).toContain(
      'EPSILON_NOT_ALLOWED',
    )
  })

  it('allows an ε-transition on an ε-NFA', () => {
    expect(codesOf(enfaZerosThenOnes)).toEqual([])
  })
})

describe('validateFA — determinism', () => {
  it('rejects two moves on the same (state, symbol) pair', () => {
    const fa = { ...dfaContains01, transitions: [...dfaContains01.transitions, t('q0', '0', 'q2')] }
    const codes = codesOf(fa)
    expect(codes).toContain('DFA_NONDETERMINISTIC')
  })

  it('names both targets in the message, so the student can see the clash', () => {
    const fa = { ...dfaContains01, transitions: [...dfaContains01.transitions, t('q0', '0', 'q2')] }
    const result = validateFA(fa)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    const clash = result.errors.find((e) => e.code === 'DFA_NONDETERMINISTIC')
    expect(clash?.message).toContain('q1')
    expect(clash?.message).toContain('q2')
  })

  it('does not complain about nondeterminism on an NFA', () => {
    expect(codesOf(nfaEndsIn01)).toEqual([])
  })

  /**
   * phases.md P0.1: "validate() on a DFA with two transitions for the same
   * (state, symbol) returns *all* violations, not the first."
   */
  it('returns every violation, not the first', () => {
    const broken: FiniteAutomaton = {
      kind: 'DFA',
      states: ['q0', 'q1'],
      alphabet: ['0', '1'],
      transitions: [
        t('q0', '0', 'q0'),
        t('q0', '0', 'q1'), // nondeterministic
        { ...t('q1', '1', 'q0'), id: 'dup' },
        { ...t('q1', '0', 'q0'), id: 'dup' }, // duplicate id
        t('q0', 'x', 'q1'), // symbol outside the alphabet
        t('q0', null, 'q1'), // ε on a DFA
      ],
      start: 'nowhere', // unknown start
      accepting: ['ghost'], // unknown accepting state
    }

    const codes = codesOf(broken)
    expect(new Set(codes)).toEqual(
      new Set([
        'START_NOT_IN_STATES',
        'ACCEPTING_NOT_IN_STATES',
        'DUPLICATE_TRANSITION_ID',
        'SYMBOL_NOT_IN_ALPHABET',
        'EPSILON_NOT_ALLOWED',
        'DFA_NONDETERMINISTIC',
      ]),
    )
  })

  it('reports errors in a deterministic order across runs', () => {
    const fa = { ...dfaContains01, start: 'nowhere', transitions: [...dfaContains01.transitions, t('q0', '0', 'q2')] }
    expect(codesOf(fa)).toEqual(codesOf(fa))
  })
})

describe('completeness', () => {
  it('an incomplete DFA is valid but not complete', () => {
    expect(validateFA(partialDfaZeros).ok).toBe(true)
    expect(isComplete(partialDfaZeros)).toBe(false)
    expect(isComplete(dfaContains01)).toBe(true)
  })

  it('completeDFA routes every missing move to a trap state', () => {
    const completed = completeDFA(partialDfaZeros)
    expect(isComplete(completed)).toBe(true)
    expect(completed.states).toContain('qTrap')
    expect(completed.accepting).toEqual(partialDfaZeros.accepting)
    expect(validateFA(completed).ok).toBe(true)
  })

  it('completeDFA leaves an already-complete machine untouched', () => {
    expect(completeDFA(dfaContains01)).toBe(dfaContains01)
  })

  it('completeDFA picks a free name when qTrap is taken', () => {
    const taken: FiniteAutomaton = { ...partialDfaZeros, states: ['q0', 'qTrap'] }
    expect(completeDFA(taken).states).toContain('qTrap1')
  })
})
