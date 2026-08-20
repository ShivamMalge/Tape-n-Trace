/**
 * Keyword search — Hopcroft 2e §2.4.
 *
 * The NFA and the DFA must accept the same language, and the DFA must find every
 * occurrence including overlapping ones. `webay` containing both `web` and
 * `ebay` is the textbook's own example precisely because a search that reports
 * only the first match looks correct until it is not.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  isErr,
  keywordDFA,
  keywordMachines,
  keywordNFA,
  minimize,
  nfaToDfa,
  searchText,
  simulateDFA,
  unwrap,
  validateFA,
} from '../src/index.js'
import type { FiniteAutomaton, Trace } from '../src/index.js'
import { languageUpTo } from './helpers/oracle.js'
import { SEED } from './helpers/seed.js'

function machineOf(trace: Trace): FiniteAutomaton {
  if (trace.result.type !== 'machine') throw new Error('expected a machine')
  return trace.result.machine as FiniteAutomaton
}

describe('the two machines of §2.4', () => {
  const built = unwrap(keywordMachines(['web', 'ebay']))

  it('both are valid, and the NFA is the smaller one to write down', () => {
    expect(validateFA(built.nfa).ok).toBe(true)
    expect(validateFA(built.dfa).ok).toBe(true)
    expect(built.nfa.kind).toBe('NFA')
    expect(built.dfa.kind).toBe('DFA')
  })

  it('the NFA has one state per proper prefix, plus the start (§2.4.2)', () => {
    // "web" and "ebay" contribute 3 + 4 chain states on top of the start state.
    expect(built.nfa.states).toHaveLength(1 + 3 + 4)
    expect(built.nfa.accepting).toHaveLength(2)
  })

  it('the DFA has one state per distinct prefix (§2.4.3)', () => {
    // web and ebay share no prefix, so both machines happen to be 8 states: the
    // DFA's saving is determinism, not size.
    expect(built.dfa.states).toHaveLength(8)
    expect(built.dfa.states).toContain('web')
    expect(built.dfa.states).toContain('ebay')
  })

  it('merges prefixes the NFA keeps apart, when there are any to merge', () => {
    // web and webs share w, we, web — four distinct prefixes plus the start,
    // against the NFA's separate chains of 3 and 4.
    const shared = unwrap(keywordMachines(['web', 'webs']))
    expect(shared.dfa.states).toHaveLength(5)
    expect(shared.nfa.states).toHaveLength(8)
    expect(shared.dfa.states.length).toBeLessThan(shared.nfa.states.length)
  })

  it('they accept the same language', () => {
    expect(languageUpTo(built.dfa, 6)).toEqual(languageUpTo(built.nfa, 6))
  })

  it('the DFA is the subset construction of the NFA, up to naming', { timeout: 120_000 }, () => {
    const viaSubset = machineOf(unwrap(minimize(machineOf(unwrap(nfaToDfa(built.nfa))))))
    const direct = machineOf(unwrap(minimize(built.dfa)))
    expect(languageUpTo(direct, 7)).toEqual(languageUpTo(viaSubset, 7))
  })

  it('agrees with the subset construction on random keyword sets', () => {
    const keyword = fc.stringMatching(/^[ab]{1,4}$/)
    fc.assert(
      fc.property(fc.uniqueArray(keyword, { minLength: 1, maxLength: 3 }), (keywords) => {
        const machines = unwrap(keywordMachines(keywords))
        expect(languageUpTo(machines.dfa, 6)).toEqual(languageUpTo(machines.nfa, 6))
      }),
      { seed: SEED, numRuns: 60 },
    )
  })
})

describe('searching', () => {
  /**
   * phases.md P0.4 — text search on {web, ebay} with input `webay` reports the
   * textbook's match set. Both keywords occur, and they overlap on the `eb`.
   */
  it('finds both overlapping keywords in "webay"', () => {
    const result = unwrap(searchText(['web', 'ebay'], 'webay'))

    expect(result.matches).toEqual([
      { keyword: 'web', start: 0, end: 3 },
      { keyword: 'ebay', start: 1, end: 5 },
    ])
  })

  it('reports every occurrence, not just the first', () => {
    const result = unwrap(searchText(['ab'], 'abab'))
    expect(result.matches.map((m) => m.start)).toEqual([0, 2])
  })

  it('finds a keyword that is a suffix of another', () => {
    const result = unwrap(searchText(['bay', 'ebay'], 'ebay'))
    expect(result.matches.map((m) => m.keyword).sort()).toEqual(['bay', 'ebay'])
  })

  it('records the state after every character, for the head scan', () => {
    const result = unwrap(searchText(['web'], 'aweb'))
    expect(result.path).toHaveLength(4)
    expect(result.path.at(-1)).toBe('web')
  })

  it('treats a character no keyword uses as breaking every partial match', () => {
    const result = unwrap(searchText(['web'], 'we!web'))
    expect(result.matches).toEqual([{ keyword: 'web', start: 3, end: 6 }])
  })

  it('finds nothing in text that contains nothing', () => {
    expect(unwrap(searchText(['web'], 'nothing here')).matches).toEqual([])
  })

  it('handles the empty text', () => {
    const result = unwrap(searchText(['web'], ''))
    expect(result.matches).toEqual([])
    expect(result.path).toEqual([])
  })

  it('refuses an empty keyword list, and the empty string as a keyword', () => {
    expect(isErr(searchText([], 'text'))).toBe(true)
    const empty = searchText([''], 'text')
    expect(isErr(empty)).toBe(true)
    if (!isErr(empty)) return
    expect(empty.errors[0]?.code).toBe('EMPTY_KEYWORD')
  })

  /** Brute force: every position, every keyword. Slow, obvious, independent. */
  it('agrees with a naive scan on random text', () => {
    const keyword = fc.stringMatching(/^[ab]{1,3}$/)
    fc.assert(
      fc.property(
        fc.uniqueArray(keyword, { minLength: 1, maxLength: 3 }),
        fc.stringMatching(/^[abc]{0,14}$/),
        (keywords, text) => {
          const found = unwrap(searchText(keywords, text)).matches

          const expected: { keyword: string; start: number; end: number }[] = []
          for (let i = 0; i < text.length; i++) {
            for (const word of keywords) {
              if (text.startsWith(word, i)) {
                expected.push({ keyword: word, start: i, end: i + word.length })
              }
            }
          }

          const key = (m: { keyword: string; start: number }): string => `${m.start}:${m.keyword}`
          expect(found.map(key).sort()).toEqual(expected.map(key).sort())
        },
      ),
      { seed: SEED, numRuns: 200 },
    )
  })
})

/**
 * phases.md P0.4 — text search reuses `simulateDFA`. No bespoke simulator.
 *
 * `searchText` runs `simulateDFA` and reads the head-scan path out of the
 * trace's own snapshots, so there is only one simulator in the codebase. These
 * tests pin that down: the path must be the path `simulateDFA` takes, prefix by
 * prefix.
 */
describe('the scan and the shared simulator agree', () => {
  it('reaches the same state as simulateDFA at every prefix', () => {
    const keywords = ['web', 'ebay']
    const text = 'awebayweb'
    const result = unwrap(searchText(keywords, text))

    for (let i = 1; i <= text.length; i++) {
      const trace = unwrap(simulateDFA(result.machines.dfa, text.slice(0, i)))
      const final = trace.steps.at(-1)?.snapshot as { state: string | null }
      expect(final.state, `after "${text.slice(0, i)}"`).toBe(result.path[i - 1])
    }
  })

  it('a match ends exactly where simulateDFA accepts', () => {
    const result = unwrap(searchText(['web'], 'aweb'))
    const accepted = unwrap(simulateDFA(result.machines.dfa, 'aweb'))
    expect(accepted.result).toEqual({ type: 'acceptance', accepted: true })
    expect(result.matches).toEqual([{ keyword: 'web', start: 1, end: 4 }])
  })

  it('the DFA accepts a string exactly when it ends in a keyword', () => {
    const machines = unwrap(keywordMachines(['ab', 'ba']))
    for (const word of ['ab', 'ba', 'aab', 'aba', 'b', 'a', '']) {
      const trace = unwrap(simulateDFA(machines.dfa, word))
      const accepted = trace.result.type === 'acceptance' && trace.result.accepted
      expect(accepted, `"${word}"`).toBe(word.endsWith('ab') || word.endsWith('ba'))
    }
  })
})

describe('the machines are built deterministically', () => {
  it('the same keywords give byte-identical machines', () => {
    const a = unwrap(keywordMachines(['web', 'ebay']))
    const b = unwrap(keywordMachines(['web', 'ebay']))
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('a repeated keyword changes nothing', () => {
    const once = unwrap(keywordMachines(['web']))
    const twice = unwrap(keywordMachines(['web', 'web']))
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })

  it('the direct builders match what keywordMachines returns', () => {
    const machines = unwrap(keywordMachines(['ab']))
    expect(keywordNFA(['ab'], machines.alphabet)).toEqual(machines.nfa)
    expect(keywordDFA(['ab'], machines.alphabet)).toEqual(machines.dfa)
  })
})
