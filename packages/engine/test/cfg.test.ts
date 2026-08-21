/**
 * Grammars, derivations, parse trees, ambiguity, left recursion — P1.3.
 *
 * The yield property is the backbone: every parse tree the engine ever builds
 * must read back the string its derivation derived, across 200 random grammars.
 * A tree that drifts from its derivation is the exact bug a student cannot see.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  deriveString,
  detectAmbiguity,
  eliminateLeftRecursion,
  findDerivation,
  generatedStrings,
  grammarToText,
  isErr,
  isLeftRecursive,
  leftmostDerivationsOf,
  parseGrammar,
  primedName,
  replay,
  tokenise,
  treeYield,
  unwrap,
} from '../src/index.js'
import type { CFG, DeriveSnapshot, Trace } from '../src/index.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'
import { SEED } from './helpers/seed.js'

const doneConsistency = (snapshot: unknown): boolean | string => {
  const status = (snapshot as { status?: unknown }).status
  return status === 'done' || `final status is ${JSON.stringify(status)}, expected done`
}

function grammar(source: string, start?: string): CFG {
  return unwrap(parseGrammar(source, start === undefined ? {} : { start }))
}

// ---------------------------------------------------------------------------

describe('parseGrammar', () => {
  it('reads the bank’s unspaced style: characters, primes attached', () => {
    const g = grammar('S -> aSb | ε')
    expect(g.variables).toEqual(['S'])
    expect(g.terminals.sort()).toEqual(['a', 'b'])
    expect(g.productions).toEqual([
      { head: 'S', body: ['a', 'S', 'b'] },
      { head: 'S', body: [] },
    ])
    expect(tokenise("TE'")).toEqual(['T', "E'"])
  })

  it('reads the spaced style, keeping id one terminal', () => {
    const g = grammar('E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id')
    expect(g.terminals).toContain('id')
    expect(g.productions[0]?.body).toEqual(['E', '+', 'T'])
    expect(g.start).toBe('E')
  })

  it('accepts → as well as ->, and eps for ε', () => {
    const g = grammar('S → aS | eps')
    expect(g.productions[1]?.body).toEqual([])
  })

  /** phases.md P1.3 — positioned errors, all surfaced at once. */
  it('reports every error with its source position', () => {
    const source = 'S -> aS | ε\nno arrow here\nX Y -> a\nT -> a | | b'
    const result = parseGrammar(source)
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return

    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('GRAMMAR_NO_ARROW')
    expect(codes).toContain('GRAMMAR_BAD_HEAD')
    expect(codes).toContain('GRAMMAR_EMPTY_ALTERNATIVE')
    expect(result.errors.length).toBe(3)

    for (const error of result.errors) {
      expect(error.position, error.code).toBeTypeOf('number')
    }
    // The no-arrow error points at its own line, not the file start.
    const noArrow = result.errors.find((e) => e.code === 'GRAMMAR_NO_ARROW')
    expect(noArrow?.position).toBe(source.indexOf('no arrow'))
  })

  it('infers the start symbol from the first head, overridably', () => {
    expect(grammar('A -> a\nB -> b').start).toBe('A')
    expect(grammar('A -> a\nB -> b', 'B').start).toBe('B')
  })

  it('round-trips through grammarToText', () => {
    const g = grammar('S -> a S b | ε')
    expect(unwrap(parseGrammar(grammarToText(g)))).toEqual(g)
  })
})

// ---------------------------------------------------------------------------

describe('derivations', () => {
  const anbn = grammar('S -> aSb | ε')

  /** phases.md P1.3 — aaabbb in 4 leftmost steps, correct tree. */
  it('derives aaabbb in exactly 4 leftmost steps with the right tree', () => {
    const trace = unwrap(deriveString(anbn, [...'aaabbb'], 'leftmost'))
    // Opening step + 4 applications + summary.
    expect(trace.steps).toHaveLength(6)
    expect(trace.meta.counters['productionsApplied']).toBe(4)

    const final = trace.steps.at(-1)?.snapshot as DeriveSnapshot
    expect(final.input.join('')).toBe('aaabbb')
    expect(treeYield(final.nodes).join('')).toBe('aaabbb')
    assertTraceInvariants(trace as Trace, { finalSnapshotMatchesResult: doneConsistency })
  })

  it('derives the empty string via the ε-production', () => {
    const trace = unwrap(deriveString(anbn, [], 'leftmost'))
    const final = trace.steps.at(-1)?.snapshot as DeriveSnapshot
    expect(final.input).toEqual([])
    expect(treeYield(final.nodes)).toEqual([])
  })

  it('leftmost and rightmost agree on the string but not the order', () => {
    const g = grammar('S -> AB\nA -> a\nB -> b')
    const left = findDerivation(g, [...'ab'], 'leftmost')
    const right = findDerivation(g, [...'ab'], 'rightmost')
    if (left.steps === null || right.steps === null) throw new Error('both should derive ab')

    // Leftmost expands A first (position 0), rightmost expands B first.
    expect(left.steps[1]?.position).toBe(0)
    expect(right.steps[1]?.position).toBe(1)
  })

  it('reports a bounded failure honestly, never as non-membership', () => {
    const trace = unwrap(deriveString(anbn, [...'aab'], 'leftmost'))
    expect(trace.result.type).toBe('incomplete')
    expect(trace.meta.truncated?.reason).toContain('not a verdict')
  })

  it('rejects a target with symbols outside the grammar', () => {
    const result = deriveString(anbn, [...'axb'], 'leftmost')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors[0]?.code).toBe('DERIVE_UNKNOWN_SYMBOL')
  })

  /**
   * phases.md P1.3 — every parse tree's yield equals the derived string,
   * property-tested over 200 random grammars.
   */
  it('yield equals the derived string, over 200 random grammars', { timeout: 300_000 }, () => {
    const symbolArb = fc.constantFrom('a', 'b')
    const bodyArb = fc.array(fc.constantFrom('a', 'b', 'S', 'T'), { minLength: 0, maxLength: 3 })
    const grammarArb = fc
      .record({
        sBodies: fc.array(bodyArb, { minLength: 1, maxLength: 3 }),
        tBodies: fc.array(bodyArb, { minLength: 1, maxLength: 2 }),
        base: fc.array(symbolArb, { minLength: 1, maxLength: 2 }),
      })
      .map(({ sBodies, tBodies, base }): CFG => ({
        variables: ['S', 'T'],
        terminals: ['a', 'b'],
        productions: [
          // A guaranteed terminal alternative keeps the language non-empty.
          { head: 'S', body: base },
          ...sBodies.map((body) => ({ head: 'S', body })),
          ...tBodies.map((body) => ({ head: 'T', body })),
        ],
        start: 'S',
      }))

    fc.assert(
      fc.property(grammarArb, (g) => {
        // Sample the grammar's own language, then re-derive each string and
        // check the tree reads it back.
        const sample = [...generatedStrings(g, 4, 4_000)].slice(0, 5)
        for (const word of sample) {
          const trace = deriveString(g, [...word], 'leftmost')
          if (!trace.ok || trace.value.result.type !== 'value') continue
          const final = trace.value.steps.at(-1)?.snapshot as DeriveSnapshot
          expect(treeYield(final.nodes).join(''), `${grammarToText(g)} on "${word}"`).toBe(word)
        }
      }),
      { seed: SEED, numRuns: 200 },
    )
  })
})

// ---------------------------------------------------------------------------

describe('ambiguity', () => {
  const classic = grammar('E -> E + E | E * E | ( E ) | id')
  const rewrite = grammar('E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id')

  /** phases.md P1.3 — two parse trees for id + id * id in the classic grammar. */
  it('finds two distinct leftmost derivations of id + id * id', () => {
    const derivations = leftmostDerivationsOf(classic, ['id', '+', 'id', '*', 'id'])
    expect(derivations).toHaveLength(2)

    const [first, second] = derivations
    const treeA = replay(classic, first as number[])
    const treeB = replay(classic, second as number[])
    // Both trees yield the witness, and they are different trees.
    expect(treeYield(treeA).join(' ')).toBe('id + id * id')
    expect(treeYield(treeB).join(' ')).toBe('id + id * id')
    expect(JSON.stringify(treeA)).not.toBe(JSON.stringify(treeB))
  })

  it('the detector finds an ambiguous witness in the classic grammar', () => {
    const result = unwrap(detectAmbiguity(classic))
    expect(result.ambiguous).toBe(true)
    if (!result.ambiguous) return

    expect(result.trees[0]).not.toEqual(result.trees[1])
    expect(treeYield(result.trees[0]).join(' ')).toBe(result.witness.join(' '))
    expect(treeYield(result.trees[1]).join(' ')).toBe(result.witness.join(' '))
  })

  /** phases.md P1.3 — the rewrite gets "no counterexample within bounds". */
  it('never claims the unambiguous rewrite is unambiguous', () => {
    const result = unwrap(detectAmbiguity(rewrite))
    expect(result.ambiguous).toBe(false)
    if (result.ambiguous) return

    expect(result.note).toContain('within the bounds')
    expect(result.note).toContain('not a proof of unambiguity')
    expect(result.note).toContain('undecidable')
    expect(result.note.toLowerCase()).not.toMatch(/is unambiguous/)
    expect(result.bounded.statesExplored).toBeGreaterThan(0)
  })

  it('flags the bank’s S -> aSb | SS | ε grammar', () => {
    const result = unwrap(detectAmbiguity(grammar('S -> aSb | SS | ε')))
    expect(result.ambiguous).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe('left recursion elimination', () => {
  const exam = grammar('E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id')

  /** phases.md P1.3 — the exam grammar produces the textbook answer. */
  it('rewrites the exam grammar to the textbook answer', () => {
    const trace = unwrap(eliminateLeftRecursion(exam))
    expect(trace.result.type).toBe('grammar')
    if (trace.result.type !== 'grammar') return
    const g = trace.result.grammar

    // E → T E′, E′ → + T E′ | ε, T → F T′, T′ → * F T′ | ε, F unchanged.
    const text = grammarToText(g)
    expect(text).toContain("E -> T E'")
    expect(text).toContain("E' -> + T E' | ε")
    expect(text).toContain("T -> F T'")
    expect(text).toContain("T' -> * F T' | ε")
    expect(text).toContain('F -> ( E ) | id')
    assertTraceInvariants(trace as Trace, { finalSnapshotMatchesResult: doneConsistency })
  })

  /** And the result is checked structurally, not by eye. */
  it('the result has no left-recursive variable, structurally', () => {
    expect(isLeftRecursive(exam)).toBe(true)
    const trace = unwrap(eliminateLeftRecursion(exam))
    if (trace.result.type !== 'grammar') throw new Error('no grammar')
    expect(isLeftRecursive(trace.result.grammar)).toBe(false)
  })

  it('isLeftRecursive sees indirect recursion through leading variables', () => {
    // A ⇒ Bc ⇒ Aac — left-recursive without any A → A… production.
    expect(isLeftRecursive(grammar('A -> Ba | c\nB -> Ab | d'))).toBe(true)
    expect(isLeftRecursive(grammar('A -> aB\nB -> b'))).toBe(false)
  })

  it('refuses ε-productions and unit cycles with the reason', () => {
    const withEpsilon = eliminateLeftRecursion(grammar('A -> Aa | ε'))
    expect(isErr(withEpsilon)).toBe(true)
    if (isErr(withEpsilon)) {
      expect(withEpsilon.errors[0]?.code).toBe('LEFTREC_EPSILON_INPUT')
    }

    const withCycle = eliminateLeftRecursion(grammar('A -> A | a'))
    expect(isErr(withCycle)).toBe(true)
    if (isErr(withCycle)) {
      expect(withCycle.errors.map((e) => e.code)).toContain('LEFTREC_CYCLE')
    }
  })

  it('names primed variables canonically and freshly', () => {
    expect(primedName('E', new Set(['E']))).toBe("E'")
    expect(primedName('E', new Set(['E', "E'"]))).toBe("E''")
  })

  it('says out loud that it introduces ε-productions', () => {
    const trace = unwrap(eliminateLeftRecursion(exam))
    const narrations = trace.steps.map((s) => s.narration).join(' ')
    expect(narrations).toContain('ε')
    expect(trace.steps.at(-1)?.narration).toContain('order matters')
  })

  /**
   * phases.md P1.3 — language-equivalent to the original on a bounded sample,
   * for 100 random left-recursive grammars.
   */
  it('preserves the language on a sample, over 100 random grammars', { timeout: 300_000 }, () => {
    const terminal = fc.constantFrom('a', 'b')
    const tail = fc.array(fc.constantFrom('a', 'b', 'B'), { minLength: 1, maxLength: 2 })
    const grammarArb = fc
      .record({
        alpha: tail, // A -> A alpha — guaranteed immediate left recursion
        beta: fc.array(terminal, { minLength: 1, maxLength: 2 }),
        bBody: fc.array(terminal, { minLength: 1, maxLength: 2 }),
        extraB: fc.option(tail, { nil: undefined }),
      })
      .map(({ alpha, beta, bBody, extraB }): CFG => ({
        variables: ['A', 'B'],
        terminals: ['a', 'b'],
        productions: [
          { head: 'A', body: ['A', ...alpha] },
          { head: 'A', body: beta },
          { head: 'B', body: bBody },
          ...(extraB === undefined ? [] : [{ head: 'B', body: ['b', ...extraB] }]),
        ],
        start: 'A',
      }))

    fc.assert(
      fc.property(grammarArb, (g) => {
        expect(isLeftRecursive(g)).toBe(true)
        const trace = unwrap(eliminateLeftRecursion(g))
        if (trace.result.type !== 'grammar') throw new Error('no grammar')
        const rewritten = trace.result.grammar

        expect(isLeftRecursive(rewritten)).toBe(false)
        const before = generatedStrings(g, 5, 8_000)
        const after = generatedStrings(rewritten, 5, 8_000)
        expect([...after].sort(), grammarToText(g)).toEqual([...before].sort())
      }),
      { seed: SEED, numRuns: 100 },
    )
  })
})
