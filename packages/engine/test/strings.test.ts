/**
 * Strings and languages — Hopcroft 2e §1.5.
 *
 * Mostly a defence of one fact students lose marks on: Σ⁰ is `{ε}`, a set with
 * one element, not the empty set.
 */

import { describe, expect, it } from 'vitest'
import {
  allStringsUpTo,
  alphabetPower,
  concat,
  countUpTo,
  displayWord,
  enumerateUpTo,
  reverse,
} from '../src/index.js'

const binary = ['0', '1']

describe('alphabetPower — Σ^k', () => {
  it('Σ⁰ is {ε}: one string, the empty one', () => {
    expect(alphabetPower(binary, 0)).toEqual([[]])
  })

  it('Σ¹ is the alphabet itself', () => {
    expect(alphabetPower(binary, 1)).toEqual([['0'], ['1']])
  })

  it('Σ² lists every pair, in alphabet order', () => {
    expect(alphabetPower(binary, 2)).toEqual([
      ['0', '0'],
      ['0', '1'],
      ['1', '0'],
      ['1', '1'],
    ])
  })

  it('has |Σ|^k members', () => {
    for (let k = 0; k <= 6; k++) {
      expect(alphabetPower(binary, k)).toHaveLength(2 ** k)
    }
    expect(alphabetPower(['a', 'b', 'c'], 3)).toHaveLength(27)
  })

  it('over an empty alphabet, only Σ⁰ is non-empty', () => {
    expect(alphabetPower([], 0)).toEqual([[]])
    expect(alphabetPower([], 1)).toEqual([])
  })

  it('rejects a negative or fractional power', () => {
    expect(() => alphabetPower(binary, -1)).toThrow(RangeError)
    expect(() => alphabetPower(binary, 1.5)).toThrow(RangeError)
  })
})

describe('allStringsUpTo', () => {
  it('yields shortest first, so the first counterexample found is the shortest', () => {
    expect([...allStringsUpTo(binary, 2)].map(displayWord)).toEqual([
      'ε',
      '0',
      '1',
      '00',
      '01',
      '10',
      '11',
    ])
  })

  it('yields the empty string even at length 0', () => {
    expect([...allStringsUpTo(binary, 0)]).toEqual([[]])
  })

  it('agrees with countUpTo', () => {
    for (let k = 0; k <= 8; k++) {
      expect([...allStringsUpTo(binary, k)]).toHaveLength(countUpTo(2, k))
    }
  })
})

describe('countUpTo', () => {
  it('sums the geometric series 1 + s + s² + …', () => {
    expect(countUpTo(2, 0)).toBe(1)
    expect(countUpTo(2, 1)).toBe(3)
    expect(countUpTo(2, 3)).toBe(15)
    expect(countUpTo(10, 2)).toBe(111)
  })

  it('handles a one-symbol alphabet, where the series is not geometric', () => {
    expect(countUpTo(1, 4)).toBe(5)
  })

  it('is zero below length 0', () => {
    expect(countUpTo(2, -1)).toBe(0)
  })
})

describe('enumerateUpTo', () => {
  it('lists everything when it fits', () => {
    const result = enumerateUpTo(binary, 3)
    expect(result.words).toHaveLength(15)
    expect(result.total).toBe(15)
    expect(result).not.toHaveProperty('truncated')
  })

  it('reports the cap rather than silently listing fewer (§9)', () => {
    const result = enumerateUpTo(binary, 10, { limit: 20 })
    expect(result.words).toHaveLength(20)
    expect(result.total).toBe(2047)
    expect(result.truncated?.limit).toBe(20)
    expect(result.truncated?.reason).toContain('2,047')
  })
})

describe('concatenation and reversal', () => {
  it('concatenates', () => {
    expect(displayWord(concat(['0', '1'], ['1']))).toBe('011')
  })

  it('treats the empty string as the identity', () => {
    expect(concat([], ['0'])).toEqual(['0'])
    expect(concat(['0'], [])).toEqual(['0'])
  })

  it('reverses without mutating its argument', () => {
    const word = ['0', '1', '1']
    expect(displayWord(reverse(word))).toBe('110')
    expect(word).toEqual(['0', '1', '1'])
  })

  it('(xy)^R = y^R x^R', () => {
    const x = ['0', '1']
    const y = ['1', '1', '0']
    expect(reverse(concat(x, y))).toEqual(concat(reverse(y), reverse(x)))
  })
})

describe('displayWord', () => {
  it('shows the empty string as ε, which is the only place the glyph belongs', () => {
    expect(displayWord([])).toBe('ε')
    expect(displayWord(['0'])).toBe('0')
  })
})
