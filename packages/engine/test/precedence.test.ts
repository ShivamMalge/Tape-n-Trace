/**
 * Regular-expression precedence — Hopcroft 2e §3.1.3.
 *
 * phases.md P0.4: "RE precedence tested against a table of at least 30
 * expressions with their intended parse."
 *
 * The table below is the whole point. Precedence bugs do not crash — they
 * silently parse `01*` as `(01)*` and produce a machine for a different
 * language, which a student then trusts. Each row states the intended reading in
 * fully-bracketed form, and the test asserts that the parser agrees.
 *
 * Reading the table: the second column is what the expression *means*, written
 * with every bracket made explicit. Star binds tightest, then concatenation,
 * then union.
 */

import { describe, expect, it } from 'vitest'
import { isErr, parseRegex, regexToString } from '../src/index.js'
import type { RegexNode } from '../src/index.js'

function parse(source: string): RegexNode {
  const result = parseRegex(source)
  if (isErr(result)) throw new Error(`"${source}" did not parse: ${result.errors[0]?.message}`)
  return result.value
}

/**
 * A fully-bracketed rendering, so two expressions compare equal only when they
 * have the same *shape*. `regexToString` deliberately omits brackets precedence
 * implies, which is the wrong tool for asserting precedence.
 */
function shape(node: RegexNode): string {
  switch (node.op) {
    case 'empty':
      return '∅'
    case 'epsilon':
      return 'ε'
    case 'symbol':
      return node.sym
    case 'star':
      return `(${shape(node.inner)})*`
    case 'concat':
      return `(${shape(node.left)}·${shape(node.right)})`
    case 'union':
      return `(${shape(node.left)}+${shape(node.right)})`
  }
}

/** [expression, its intended reading, fully bracketed] */
const TABLE: [string, string][] = [
  // Star binds tighter than concatenation.
  ['01*', '(0·(1)*)'],
  ['0*1', '((0)*·1)'],
  ['0*1*', '((0)*·(1)*)'],
  ['(01)*', '((0·1))*'],
  ['0**', '((0)*)*'],
  ['01**', '(0·((1)*)*)'],

  // Concatenation binds tighter than union.
  ['01+1', '((0·1)+1)'],
  ['0+11', '(0+(1·1))'],
  ['01+10', '((0·1)+(1·0))'],
  ['0(1+1)', '(0·(1+1))'],
  ['(0+1)1', '((0+1)·1)'],

  // Star against union.
  ['0+1*', '(0+(1)*)'],
  ['0*+1', '((0)*+1)'],
  ['(0+1)*', '((0+1))*'],
  ['0*+1*', '((0)*+(1)*)'],

  // All three together — the readings students most often get wrong.
  ['01*+1', '((0·(1)*)+1)'],
  ['(0+1)*01', '((((0+1))*·0)·1)'],
  ['(0+1)*01(0+1)*', '(((((0+1))*·0)·1)·((0+1))*)'],
  ['0(0+1)*1', '((0·((0+1))*)·1)'],
  ['00*11*', '(((0·(0)*)·1)·(1)*)'],

  // Union is left-associative; concatenation likewise.
  ['0+1+0', '((0+1)+0)'],
  ['0+(1+0)', '(0+(1+0))'],
  ['011', '((0·1)·1)'],
  ['0(11)', '(0·(1·1))'],

  // `|` is accepted as a synonym for `+` and parses identically.
  ['0|1', '(0+1)'],
  ['01|1', '((0·1)+1)'],
  ['0|1*', '(0+(1)*)'],

  // ε and ∅ are atoms, and bind like any other.
  ['ε', 'ε'],
  ['∅', '∅'],
  ['ε*', '(ε)*'],
  ['0ε', '(0·ε)'],
  ['ε+0', '(ε+0)'],
  ['∅*', '(∅)*'],
  ['0∅1', '((0·∅)·1)'],

  // Brackets that precedence already implies change nothing.
  ['(0)(1)', '(0·1)'],
  ['(0*)', '(0)*'],
  ['((0+1))', '(0+1)'],
  ['(0*)1', '((0)*·1)'],

  // An escaped operator is an ordinary symbol.
  ['\\*', '*'],
  ['\\+0', '(+·0)'],
  ['a\\*b', '((a·*)·b)'],
]

describe('precedence: star, then concatenation, then union (§3.1.3)', () => {
  it(`covers at least 30 expressions — this table has ${TABLE.length}`, () => {
    expect(TABLE.length).toBeGreaterThanOrEqual(30)
  })

  it.each(TABLE)('%s parses as %s', (source, intended) => {
    expect(shape(parse(source))).toBe(intended)
  })

  /**
   * Printing is idempotent: print, re-parse, print again, and nothing moves.
   *
   * Not shape equality, which would be too strong. Union and concatenation are
   * associative, so the printer drops the brackets in `0+(1+0)` and prints
   * `0+1+0` — a differently shaped tree for the same language, and the more
   * readable answer. What must hold is that the parser and the printer agree
   * about precedence, and that is exactly what idempotence pins down.
   */
  it.each(TABLE.map(([source]) => source))('%s prints to a fixed point', (source) => {
    const printed = regexToString(parse(source))
    expect(regexToString(parse(printed))).toBe(printed)
  })

  it('never invents a different reading for the same expression', () => {
    for (const [source] of TABLE) {
      expect(shape(parse(source))).toBe(shape(parse(source)))
    }
  })
})
