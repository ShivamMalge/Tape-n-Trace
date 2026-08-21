/**
 * The graders — phases.md P1.1.
 *
 * The two properties worth everything here: any correct machine passes, however
 * it is shaped, and a wrong machine gets the *shortest* string it fails on. The
 * first is what makes grading fair; the second is what makes it teaching.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  SAMPLE_CAVEAT,
  areEquivalentDetailed,
  compareTraces,
  gradeLanguage,
  isErr,
  nfaToDfa,
  sampleCompare,
  simulateDFA,
  TraceBuilder,
  unwrap,
} from '../src/index.js'
import type { FiniteAutomaton, Sym, Trace } from '../src/index.js'
import { dfaArb, nfaArb } from './helpers/arbitraries.js'
import { allStringsUpTo, bruteForceMembership } from './helpers/oracle.js'
import { SEED } from './helpers/seed.js'
import { dfaContains01, nfaEndsIn01, t } from './helpers/machines.js'

const SLOW = { timeout: 300_000 }

function grade(student: FiniteAutomaton, reference: FiniteAutomaton) {
  return unwrap(gradeLanguage(student, reference))
}

describe('gradeLanguage — correctness is language, not structure', () => {
  /** A correct machine with different structure: contains-01 built bigger. */
  const bloated: FiniteAutomaton = {
    kind: 'DFA',
    states: ['s', 'saw0', 'done', 'done2'],
    alphabet: ['0', '1'],
    transitions: [
      t('s', '0', 'saw0'),
      t('s', '1', 's'),
      t('saw0', '0', 'saw0'),
      t('saw0', '1', 'done'),
      t('done', '0', 'done2'),
      t('done', '1', 'done'),
      t('done2', '0', 'done2'),
      t('done2', '1', 'done'),
    ],
    start: 's',
    accepting: ['done', 'done2'],
  }

  it('a different but correct DFA grades as correct', () => {
    const result = grade(bloated, dfaContains01)
    expect(result.verdict).toBe('correct')
  })

  it('minimality is reported as a bonus, never as a failure', () => {
    const result = grade(bloated, dfaContains01)
    if (result.verdict !== 'correct') throw new Error('should be correct')
    expect(result.minimal).toBe(false)
    expect(result.stateCount).toBe(4)
    expect(result.minimalStateCount).toBe(3)

    const tight = grade(dfaContains01, dfaContains01)
    if (tight.verdict !== 'correct') throw new Error('should be correct')
    expect(tight.minimal).toBe(true)
  })

  it('accepts an NFA or ε-NFA submission by determinising it first', () => {
    // The NFA for ends-in-01, graded against its own determinisation.
    const referenceDfa = unwrap(nfaToDfa(nfaEndsIn01)).result
    if (referenceDfa.type !== 'machine') throw new Error('no machine')
    const result = grade(nfaEndsIn01, referenceDfa.machine as FiniteAutomaton)
    expect(result.verdict).toBe('correct')
  })

  it('returns every validation problem for a broken submission', () => {
    const broken = { ...dfaContains01, start: 'nowhere', accepting: ['ghost'] }
    const result = gradeLanguage(broken, dfaContains01)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects symbols outside the exercise alphabet, with a message', () => {
    const offAlphabet: FiniteAutomaton = {
      ...dfaContains01,
      alphabet: ['0', '1', 'x'],
      transitions: [...dfaContains01.transitions, t('q0', 'x', 'q0')],
    }
    const result = gradeLanguage(offAlphabet, dfaContains01)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('ALPHABET_BEYOND_EXERCISE')
  })
})

describe('gradeLanguage — the witness is the feedback', () => {
  /**
   * phases.md P1.1 — a student DFA wrong on exactly one long string receives
   * that string. L = 0* against a student who only counted to five: the
   * machines agree everywhere except strings of six or more zeros.
   */
  it('a machine wrong only on long strings receives the shortest long witness', () => {
    const reference: FiniteAutomaton = {
      kind: 'DFA',
      states: ['z'],
      alphabet: ['0', '1'],
      transitions: [t('z', '0', 'z')],
      start: 'z',
      accepting: ['z'],
    }
    // Accepts 0^0..0^5 only: a six-state chain that dies on the sixth zero.
    const chain = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']
    const student: FiniteAutomaton = {
      kind: 'DFA',
      states: chain,
      alphabet: ['0', '1'],
      transitions: chain.slice(0, -1).map((from, i) => t(from, '0', chain[i + 1] as string)),
      start: 'c0',
      accepting: chain,
    }

    const result = grade(student, reference)
    if (result.verdict !== 'wrong') throw new Error('should be wrong')
    expect(result.witness).toBe('000000')
    expect(result.side).toBe('reference-accepts')
    expect(result.explanation).toContain('rejects "000000"')
  })

  it('says which side accepts, in the student\'s terms', () => {
    const everything: FiniteAutomaton = { ...dfaContains01, accepting: ['q0', 'q1', 'q2'] }
    const result = grade(everything, dfaContains01)
    if (result.verdict !== 'wrong') throw new Error('should be wrong')
    expect(result.witness).toBe('')
    expect(result.side).toBe('student-accepts')
    expect(result.explanation).toContain('the empty string')
  })

  /**
   * phases.md P1.1 — agreement with brute force for 500 random pairs, and the
   * witness is asserted to be the *shortest* distinguishing string: every
   * shorter string agrees, the witness itself disagrees. For pairs judged
   * equivalent, brute force finds no counterexample up to length 12.
   */
  it('agrees with brute force on 500 random pairs, witness shortest', SLOW, () => {
    fc.assert(
      fc.property(dfaArb, dfaArb, (a, b) => {
        const detailed = unwrap(areEquivalentDetailed(a, b))

        if (detailed.equivalent) {
          for (const word of allStringsUpTo(a.alphabet, 12)) {
            expect(
              bruteForceMembership(a, word),
              `equivalent pair disagrees on "${word.join('')}"`,
            ).toBe(bruteForceMembership(b, word))
          }
          return
        }

        const witness = [...detailed.witness] as Sym[]
        // The witness really distinguishes them...
        expect(bruteForceMembership(a, witness)).not.toBe(bruteForceMembership(b, witness))
        // ...and nothing shorter does.
        for (const word of allStringsUpTo(a.alphabet, witness.length - 1)) {
          expect(
            bruteForceMembership(a, word),
            `"${word.join('')}" is shorter than the witness and also distinguishes`,
          ).toBe(bruteForceMembership(b, word))
        }
      }),
      { seed: SEED, numRuns: 500 },
    )
  })

  it('handles NFA submissions across random machines', SLOW, () => {
    fc.assert(
      fc.property(nfaArb, (nfa) => {
        const dfa = unwrap(nfaToDfa(nfa)).result
        if (dfa.type !== 'machine') throw new Error('no machine')
        const result = grade(nfa, dfa.machine as FiniteAutomaton)
        expect(result.verdict).toBe('correct')
      }),
      { seed: SEED, numRuns: 60 },
    )
  })
})

describe('compareTraces — the first divergent step', () => {
  const traceOf = (fa: FiniteAutomaton, word: string): Trace => unwrap(simulateDFA(fa, word)) as Trace

  it('two identical procedures match, with the step count', () => {
    const result = compareTraces(traceOf(dfaContains01, '0110'), traceOf(dfaContains01, '0110'))
    expect(result).toEqual({ matches: true, steps: 6 })
  })

  it('two runs on different inputs diverge at step 0 — the snapshot carries the input', () => {
    const result = compareTraces(traceOf(dfaContains01, '0110'), traceOf(dfaContains01, '0100'))
    if (result.matches) throw new Error('should diverge')
    expect(result.index).toBe(0)
  })

  /**
   * The scenario the grader exists for: two performances of one procedure that
   * agree for a while and then part. Built by hand, because the engine's own
   * conversions are deterministic and cannot be made to take a wrong turn.
   */
  it('reports the first step where two performances of a procedure part ways', () => {
    const build = (thirdValue: number): Trace => {
      const builder = new TraceBuilder<{ value: number }>('convert.minimize', 'shared-input')
      builder.step({ narration: 'Start at zero.', snapshot: { value: 0 } })
      builder.step({ narration: 'Advance to one.', snapshot: { value: 1 } })
      builder.step({
        narration: thirdValue === 2 ? 'Advance to two.' : 'Jump to nine.',
        snapshot: { value: thirdValue },
      })
      return builder.build({ type: 'value', value: thirdValue }) as Trace
    }

    const result = compareTraces(build(9), build(2))
    if (result.matches) throw new Error('should diverge')
    expect(result.index).toBe(2)
    expect(result.expected).toBe('Advance to two.')
    expect(result.actual).toBe('Jump to nine.')
  })

  it('reports a trace that ends early as diverging at the missing step', () => {
    const build = (steps: number): Trace => {
      const builder = new TraceBuilder<{ value: number }>('convert.minimize', 'shared-input')
      for (let i = 0; i < steps; i++) {
        builder.step({ narration: `Advance to ${i}.`, snapshot: { value: i } })
      }
      return builder.build({ type: 'value', value: steps }) as Trace
    }

    const result = compareTraces(build(2), build(4))
    if (result.matches) throw new Error('should diverge')
    expect(result.index).toBe(2)
    expect(result.expected).toBe('Advance to 2.')
    expect(result.actual).toBeNull()
  })
})

describe('sampleCompare — bounded, and says so', () => {
  const inReference = (w: Sym[]): boolean => bruteForceMembership(dfaContains01, w)

  it('agreement carries the bound as a claim, not as a proof', () => {
    const result = sampleCompare(inReference, inReference, ['0', '1'], 6)
    if (!result.agrees) throw new Error('should agree')
    expect(result.bounded).toEqual({ searchedUpTo: 6, unit: 'inputLength' })
    expect(result.checked).toBe(127)
  })

  it('disagreement returns the shortest witness in the bound, with the side', () => {
    const everything = (): boolean => true
    const result = sampleCompare(everything, inReference, ['0', '1'], 6)
    if (result.agrees) throw new Error('should disagree')
    expect(result.witness).toBe('')
    expect(result.side).toBe('student-accepts')
  })

  it('the caveat names the undecidability, because that is the lesson', () => {
    expect(SAMPLE_CAVEAT).toContain('not a proof')
    expect(SAMPLE_CAVEAT).toContain('undecidable')
  })
})
