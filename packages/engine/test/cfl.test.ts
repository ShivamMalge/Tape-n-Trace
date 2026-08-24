/**
 * CFL properties — phases.md P1.5.
 *
 * The simplification stages are checked against the book's own worked
 * examples, exactly (Examples 7.1, 7.8, 7.10, 7.12, 7.15), then against the
 * language-preservation theorems (7.2, 7.9, 7.13, 7.16) on a hundred random
 * grammars, stage by stage in Theorem 7.14's safe order. The closure
 * constructions are checked on samples against the set operations they claim
 * to implement, and the PDA-level ones against brute-force membership.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  CFL_INTERSECTION_DEMO,
  acceptsPDA,
  cfgToPDA,
  cflConcat,
  cflHomomorphism,
  cflIntersectRegular,
  cflInverseHomomorphism,
  cflReversal,
  cflStar,
  cflSubstitution,
  cflUnion,
  eliminateEpsilon,
  eliminateUnit,
  eliminateUseless,
  emptyStackToFinalState,
  expandNullable,
  generatedStrings,
  generatingSymbols,
  isCNF,
  isErr,
  nullableSymbols,
  parseGrammar,
  pdaPreset,
  reachableSymbols,
  toCNF,
  unitPairs,
  unwrap,
  wrongOrderUseless,
} from '../src/index.js'
import type { CFG, FiniteAutomaton, PDA, Result, Sym, Trace } from '../src/index.js'
import { fcParams } from './helpers/seed.js'
import { allStringsUpTo, bruteForceMembership } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

const g = (text: string): CFG => unwrap(parseGrammar(text))

/** Run a stage, check its trace, and hand back the grammar it produced. */
function stage(result: Result<Trace>): CFG {
  const trace = unwrap(result)
  assertTraceInvariants(trace)
  if (trace.result.type !== 'grammar') throw new Error(`expected a grammar result, got ${trace.result.type}`)
  return trace.result.grammar
}

const bodies = (grammar: CFG, head: string): Set<string> =>
  new Set(grammar.productions.filter((p) => p.head === head).map((p) => p.body.join(' ')))

const lang = (grammar: CFG, maxLength: number): Set<string> => generatedStrings(grammar, maxLength)

const sorted = (s: Iterable<string>): string[] => [...s].sort()

/**
 * Example 7.1 / 7.3 / 7.5 — built by hand: B is a variable with no
 * productions, and `parseGrammar` would read a symbol that never heads a
 * production as a terminal.
 */
const EXAMPLE_7_1: CFG = {
  variables: ['S', 'A', 'B'],
  terminals: ['a', 'b'],
  productions: [
    { head: 'S', body: ['A', 'B'] },
    { head: 'S', body: ['a'] },
    { head: 'A', body: ['b'] },
  ],
  start: 'S',
}

/** Example 7.8. */
const EXAMPLE_7_8 = 'S -> A B\nA -> a A A | ε\nB -> b B B | ε'

/** The expression grammar of Example 5.27, as Examples 7.10, 7.12 and 7.15 use it. */
const EXPRESSIONS = 'E -> E + T | T\nT -> T * F | F\nF -> I | ( E )\nI -> a | b | I a | I b | I 0 | I 1'

describe('useless symbols — §7.1.1–7.1.2', () => {
  it('finds the generating and reachable sets of Examples 7.3 and 7.5', () => {
    const grammar = EXAMPLE_7_1
    expect(sorted(generatingSymbols(grammar))).toEqual(sorted(['a', 'b', 'S', 'A']))
    expect(sorted(reachableSymbols(grammar))).toEqual(sorted(['S', 'A', 'B', 'a', 'b']))
  })

  it('Example 7.1 in the right order leaves only S → a', () => {
    const result = stage(eliminateUseless(EXAMPLE_7_1))
    expect(result.productions).toEqual([{ head: 'S', body: ['a'] }])
    expect(result.variables).toEqual(['S'])
    expect(result.terminals).toEqual(['a'])
  })

  it('the wrong order visibly leaves A and b behind', () => {
    const { grammar, residual } = wrongOrderUseless(EXAMPLE_7_1)
    expect(sorted(residual)).toEqual(['A', 'b'])
    expect(bodies(grammar, 'A')).toEqual(new Set(['b']))
    expect(bodies(grammar, 'S')).toEqual(new Set(['a']))
  })

  it('Exercise 7.1.1', () => {
    const result = stage(eliminateUseless(g('S -> A B | C A\nA -> a\nB -> B C | A B\nC -> a B | b')))
    expect(bodies(result, 'S')).toEqual(new Set(['C A']))
    expect(bodies(result, 'A')).toEqual(new Set(['a']))
    expect(bodies(result, 'C')).toEqual(new Set(['b']))
    expect(result.variables).not.toContain('B')
  })

  it('refuses a grammar whose language is empty, saying why', () => {
    const result = eliminateUseless(g('S -> A\nA -> S'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.code).toBe('GRAMMAR_EMPTY_LANGUAGE')
  })
})

describe('ε-productions — §7.1.3', () => {
  it('Example 7.8, exactly', () => {
    const grammar = g(EXAMPLE_7_8)
    expect(sorted(nullableSymbols(grammar))).toEqual(['A', 'B', 'S'])

    const result = stage(eliminateEpsilon(grammar))
    expect(bodies(result, 'S')).toEqual(new Set(['A B', 'A', 'B']))
    expect(bodies(result, 'A')).toEqual(new Set(['a A A', 'a A', 'a']))
    expect(bodies(result, 'B')).toEqual(new Set(['b B B', 'b B', 'b']))
    expect(result.productions.some((p) => p.body.length === 0)).toBe(false)

    // Theorem 7.9: L(G₁) = L(G) − {ε}.
    const before = lang(grammar, 6)
    expect(before.has('')).toBe(true)
    before.delete('')
    expect(sorted(lang(result, 6))).toEqual(sorted(before))
  })

  it('expands a body over the subsets of its nullable positions, duplicates collapsed', () => {
    const versions = expandNullable(['a', 'A', 'A'], new Set(['A'])).map((v) => v.join(' '))
    expect(versions).toEqual(['a A A', 'a A', 'a'])
    expect(expandNullable(['A', 'B'], new Set(['A', 'B'])).map((v) => v.join(' '))).toEqual(['A B', 'B', 'A'])
  })

  it('leaves an ε-free grammar alone', () => {
    const grammar = g('S -> a S b | a b')
    const trace = unwrap(eliminateEpsilon(grammar))
    expect(trace.steps).toHaveLength(1)
    expect(stage(eliminateEpsilon(grammar))).toEqual(grammar)
  })
})

describe('unit productions — §7.1.4', () => {
  it('Example 7.10: exactly the ten unit pairs', () => {
    const pairs = unitPairs(g(EXPRESSIONS)).map(([a, b]) => `${a},${b}`)
    expect(sorted(pairs)).toEqual(sorted(['E,E', 'E,T', 'E,F', 'E,I', 'T,T', 'T,F', 'T,I', 'F,F', 'F,I', 'I,I']))
  })

  it('Example 7.12: the rewritten expression grammar, exactly', () => {
    const result = stage(eliminateUnit(g(EXPRESSIONS)))
    const identifiers = ['a', 'b', 'I a', 'I b', 'I 0', 'I 1']
    expect(bodies(result, 'E')).toEqual(new Set(['E + T', 'T * F', '( E )', ...identifiers]))
    expect(bodies(result, 'T')).toEqual(new Set(['T * F', '( E )', ...identifiers]))
    expect(bodies(result, 'F')).toEqual(new Set(['( E )', ...identifiers]))
    expect(bodies(result, 'I')).toEqual(new Set(identifiers))
  })

  it('survives a cycle of unit productions', () => {
    const result = stage(eliminateUnit(g('A -> B | a\nB -> C\nC -> A | c')))
    expect(bodies(result, 'A')).toEqual(new Set(['a', 'c']))
    expect(bodies(result, 'B')).toEqual(new Set(['a', 'c']))
    expect(bodies(result, 'C')).toEqual(new Set(['a', 'c']))
  })
})

describe('Chomsky Normal Form — §7.1.5', () => {
  it('the four-stage pipeline on the textbook example reproduces Fig. 7.3 up to naming', () => {
    const original = g(EXPRESSIONS)
    const afterEpsilon = stage(eliminateEpsilon(original))
    const afterUnit = stage(eliminateUnit(afterEpsilon))
    const afterUseless = stage(eliminateUseless(afterUnit))
    const cnf = stage(toCNF(afterUseless))

    expect(isCNF(cnf)).toBe(true)
    // Fig. 7.3 has fifteen variables: the original four, one per terminal, and C1–C3.
    expect(cnf.variables).toHaveLength(15)
    expect(cnf.variables).toEqual(expect.arrayContaining(['E', 'T', 'F', 'I', 'A', 'B', 'C1', 'C2', 'C3']))
    expect(bodies(cnf, 'A')).toEqual(new Set(['a']))
    expect(bodies(cnf, 'B')).toEqual(new Set(['b']))
    // One chain per distinct body: T M F is shared by E and T, L E R by E, T and F.
    expect(cnf.productions.filter((p) => p.head.startsWith('C'))).toHaveLength(3)

    // Language equivalence on a sample — the criterion's check.
    expect(sorted(lang(cnf, 5))).toEqual(sorted(lang(original, 5)))
  })

  it('shares one cascade between heads with the same body', () => {
    const cnf = stage(toCNF(g('S -> A B C\nA -> A B C | a\nB -> b\nC -> c')))
    expect(cnf.variables).toEqual(['S', 'A', 'B', 'C', 'C1'])
    expect(bodies(cnf, 'S')).toEqual(new Set(['A C1']))
    expect(bodies(cnf, 'A')).toEqual(new Set(['A C1', 'a']))
    expect(bodies(cnf, 'C1')).toEqual(new Set(['B C']))
  })

  it('refuses a grammar that skipped the preliminaries, naming every problem at once', () => {
    const result = toCNF(g('S -> A | a S | ε\nA -> a\nB -> b'))
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('CNF_EPSILON')
    expect(codes).toContain('CNF_UNIT')
    expect(codes).toContain('CNF_USELESS')
  })

  it('recognises a grammar already in CNF', () => {
    const grammar = g('S -> A B | a\nA -> a\nB -> b')
    expect(isCNF(grammar)).toBe(true)
    expect(unwrap(toCNF(grammar)).steps).toHaveLength(1)
  })
})

describe('every stage preserves the language — 100 random grammars in the safe order', () => {
  const symbol = fc.constantFrom('a', 'b', 'S', 'T', 'U')
  const body = fc.array(symbol, { minLength: 0, maxLength: 3 })
  const grammarArb: fc.Arbitrary<CFG> = fc
    .record({
      s: fc.array(body, { minLength: 1, maxLength: 3 }),
      t: fc.array(body, { minLength: 0, maxLength: 2 }),
      u: fc.array(body, { minLength: 0, maxLength: 2 }),
    })
    .map(({ s, t, u }) => ({
      variables: ['S', 'T', 'U'],
      terminals: ['a', 'b'],
      productions: [
        ...s.map((b) => ({ head: 'S', body: b })),
        ...t.map((b) => ({ head: 'T', body: b })),
        ...u.map((b) => ({ head: 'U', body: b })),
      ],
      start: 'S',
    }))

  it('ε → unit → useless → CNF, each checked on every string to length 5', { timeout: 300_000 }, () => {
    fc.assert(
      fc.property(grammarArb, (grammar) => {
        const l0 = lang(grammar, 5)

        const afterEpsilon = stage(eliminateEpsilon(grammar))
        const l1 = lang(afterEpsilon, 5)
        const expected = new Set(l0)
        expected.delete('')
        expect(sorted(l1)).toEqual(sorted(expected))

        const afterUnit = stage(eliminateUnit(afterEpsilon))
        expect(sorted(lang(afterUnit, 5))).toEqual(sorted(l1))

        const useless = eliminateUseless(afterUnit)
        if (isErr(useless)) {
          // Refused only when the language is empty — and then it really is.
          expect(useless.errors[0]?.code).toBe('GRAMMAR_EMPTY_LANGUAGE')
          expect(l1.size).toBe(0)
          return
        }
        const afterUseless = stage(useless)
        expect(sorted(lang(afterUseless, 5))).toEqual(sorted(l1))

        // The safe order leaves exactly what CNF needs — Theorem 7.14.
        const cnf = stage(toCNF(afterUseless))
        expect(isCNF(cnf)).toBe(true)
        expect(sorted(lang(cnf, 5))).toEqual(sorted(l1))
      }),
      { ...fcParams, numRuns: 100 },
    )
  })
})

describe('closure under the grammar operations — §7.3.1–7.3.3', () => {
  const anbn = g('S -> a S b | a b')
  const bs = g('S -> b S | b')

  it('union renames apart and takes a fresh start symbol', () => {
    const result = stage(cflUnion(anbn, bs))
    expect(result.start).toBe("S''")
    expect(result.variables).toEqual(["S''", 'S', "S'"])
    const expected = new Set([...lang(anbn, 5), ...lang(bs, 5)])
    expect(sorted(lang(result, 5))).toEqual(sorted(expected))
  })

  it('concatenation', () => {
    const result = stage(cflConcat(anbn, bs))
    const expected = new Set<string>()
    for (const x of lang(anbn, 6)) for (const y of lang(bs, 6)) if (x.length + y.length <= 6) expected.add(x + y)
    expect(sorted(lang(result, 6))).toEqual(sorted(expected))
  })

  it('closure, ε included', () => {
    const result = stage(cflStar(anbn))
    const expected = new Set([''])
    let grew = true
    while (grew) {
      grew = false
      for (const x of [...expected]) {
        for (const y of lang(anbn, 6)) {
          const xy = x + y
          if (xy.length <= 6 && !expected.has(xy)) {
            expected.add(xy)
            grew = true
          }
        }
      }
    }
    expect(sorted(lang(result, 6))).toEqual(sorted(expected))
  })

  it('reversal', () => {
    const grammar = g('S -> a S | b')
    const result = stage(cflReversal(grammar))
    const expected = new Set([...lang(grammar, 6)].map((w) => [...w].reverse().join('')))
    expect(sorted(lang(result, 6))).toEqual(sorted(expected))
  })

  it('homomorphism, with a symbol erased', () => {
    const result = stage(cflHomomorphism(anbn, { a: ['0', '1'], b: [] }))
    expect(result.terminals).toEqual(['0', '1'])
    expect(sorted(lang(result, 6))).toEqual(['01', '0101', '010101'])
  })

  it('refuses a homomorphism that misses a terminal', () => {
    const result = cflHomomorphism(anbn, { a: ['0'] })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.message).toContain('h(b)')
  })

  it('substitution — Example 7.22 on the one-string language {01}', () => {
    const result = stage(
      cflSubstitution(g('S -> 0 1'), { '0': anbn, '1': g('S -> a a | b b') }),
    )
    expect(new Set(result.variables).size).toBe(result.variables.length)
    expect(sorted(lang(result, 6))).toEqual(sorted(['abaa', 'abbb', 'aabbaa', 'aabbbb']))
  })
})

describe('intersection with a regular language — §7.3.4', () => {
  const evenAs: FiniteAutomaton = {
    kind: 'DFA',
    states: ['e', 'o'],
    alphabet: ['a', 'b'],
    transitions: [
      { id: 'e-a', from: 'e', read: 'a', to: 'o' },
      { id: 'e-b', from: 'e', read: 'b', to: 'e' },
      { id: 'o-a', from: 'o', read: 'a', to: 'e' },
      { id: 'o-b', from: 'o', read: 'b', to: 'o' },
    ],
    start: 'e',
    accepting: ['e'],
  }

  const finalStatePda = (grammar: CFG): PDA => {
    const byEmptyStack = unwrap(cfgToPDA(grammar)).result as { type: 'machine'; machine: PDA }
    return (unwrap(emptyStackToFinalState(byEmptyStack.machine)).result as { type: 'machine'; machine: PDA }).machine
  }

  it('the product agrees with brute-force membership on every string to length 8', () => {
    const grammar = g('S -> a S b | ε')
    const pda = finalStatePda(grammar)
    const trace = unwrap(cflIntersectRegular(pda, evenAs))
    assertTraceInvariants(trace)
    const product = (trace.result as { type: 'machine'; machine: PDA }).machine

    const inL = lang(grammar, 8)
    for (const word of allStringsUpTo(['a', 'b'], 8)) {
      const w = word.join('')
      const expected = inL.has(w) && bruteForceMembership(evenAs, word)
      expect(acceptsPDA(product, word as Sym[]), `product on "${w}"`).toBe(expected)
    }
  })

  it('with a gallery PDA and an incomplete automaton, dead pairs simply stop', () => {
    const balanced = (pdaPreset('balanced-parens') as NonNullable<ReturnType<typeof pdaPreset>>).machine
    const pda = (unwrap(emptyStackToFinalState(balanced)).result as { type: 'machine'; machine: PDA }).machine
    // Strings that start with "(" and never have "((": an NFA with no dead state.
    const fa: FiniteAutomaton = {
      kind: 'NFA',
      states: ['s', 'open', 'closed'],
      alphabet: ['(', ')'],
      transitions: [
        { id: 's-(', from: 's', read: '(', to: 'open' },
        { id: 'open-)', from: 'open', read: ')', to: 'closed' },
        { id: 'closed-(', from: 'closed', read: '(', to: 'open' },
        { id: 'closed-)', from: 'closed', read: ')', to: 'closed' },
      ],
      start: 's',
      accepting: ['open', 'closed'],
    }
    const product = (unwrap(cflIntersectRegular(pda, fa)).result as { type: 'machine'; machine: PDA }).machine
    for (const word of allStringsUpTo(['(', ')'], 8)) {
      const expected = acceptsPDA(pda, word as Sym[]) === true && bruteForceMembership(fa, word)
      expect(acceptsPDA(product, word as Sym[]), `product on "${word.join('')}"`).toBe(expected)
    }
  })

  it('refuses an empty-stack PDA with a pointer to the acceptance page', () => {
    const balanced = (pdaPreset('balanced-parens') as NonNullable<ReturnType<typeof pdaPreset>>).machine
    const result = cflIntersectRegular(balanced, evenAs)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.code).toBe('INTERSECT_NEEDS_FINAL_STATE')
  })
})

describe('inverse homomorphism — §7.3.5', () => {
  const pda = (pdaPreset('anbn') as NonNullable<ReturnType<typeof pdaPreset>>).machine

  const cases: { name: string; h: Record<string, string[]> }[] = [
    { name: 'two images', h: { x: ['a', 'b'], y: ['a', 'a', 'b', 'b'] } },
    { name: 'an erased symbol', h: { x: ['a'], y: [] } },
    { name: 'images that straddle the boundary', h: { x: ['a', 'a'], y: ['b'], z: ['a', 'b', 'b'] } },
  ]

  it.each(cases)('$name: P′ accepts w exactly when P accepts h(w)', ({ h }) => {
    const trace = unwrap(cflInverseHomomorphism(pda, h))
    assertTraceInvariants(trace)
    const inverse = (trace.result as { type: 'machine'; machine: PDA }).machine
    expect(inverse.start).toBe('(q0,)')

    for (const word of allStringsUpTo(Object.keys(h), 5)) {
      const image = word.flatMap((s) => h[s] as string[])
      const expected = acceptsPDA(pda, image)
      expect(expected).not.toBeNull()
      expect(acceptsPDA(inverse, word as Sym[]), `P′ on "${word.join('')}"`).toBe(expected)
    }
  })

  it('refuses an image the PDA cannot read', () => {
    const result = cflInverseHomomorphism(pda, { x: ['a', 'z'] })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.errors[0]?.message).toContain('"z"')
  })
})

describe('the non-closure — Example 7.26', () => {
  it('L₁ and L₂ are CFLs by construction and meet exactly in aⁿbⁿcⁿ', () => {
    const l1 = lang(CFL_INTERSECTION_DEMO.l1.grammar, 6)
    const l2 = lang(CFL_INTERSECTION_DEMO.l2.grammar, 6)
    expect(l1.has('abcc')).toBe(true)
    expect(l2.has('aabc')).toBe(true)
    const both = [...l1].filter((w) => l2.has(w))
    expect(sorted(both)).toEqual(['aabbcc', 'abc'])
    expect(CFL_INTERSECTION_DEMO.pumpingGameId).toBe('abc-equal')
  })
})
