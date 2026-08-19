/**
 * The shipped presets.
 *
 * These are what a student sees first, so they are held to the same standard as
 * the algorithms: every one validates, every one carries a hand-authored layout
 * (§7), and the parameterised construction is checked against arithmetic rather
 * than against itself.
 */

import { describe, expect, it } from 'vitest'
import { GALLERY, divisibleBy, galleryEntry, isOk, simulateDFA, unwrap, validateFA } from '../src/index.js'
import type { FiniteAutomaton, Sym } from '../src/index.js'
import { allStringsUpTo, bruteForceMembership } from './helpers/oracle.js'
import { assertTraceInvariants } from './helpers/traceInvariants.js'

function accepts(fa: FiniteAutomaton, word: string): boolean {
  const trace = unwrap(simulateDFA(fa, word))
  return trace.result.type === 'acceptance' && trace.result.accepted
}

describe('every gallery preset', () => {
  it.each(GALLERY.map((e) => [e.id, e] as const))('%s validates', (_id, entry) => {
    expect(validateFA(entry.machine).ok).toBe(true)
  })

  it.each(GALLERY.map((e) => [e.id, e] as const))(
    '%s ships a layout for every state (§7)',
    (_id, entry) => {
      const layout = entry.machine.layout
      expect(layout, `${entry.id} has no layout`).toBeDefined()
      for (const state of entry.machine.states) {
        expect(layout?.[state], `${entry.id} has no position for ${state}`).toBeDefined()
      }
    },
  )

  it.each(GALLERY.map((e) => [e.id, e] as const))(
    '%s suggests only strings over its own alphabet',
    (_id, entry) => {
      const alphabet = new Set(entry.machine.alphabet)
      for (const word of entry.suggested) {
        for (const symbol of word) {
          expect(alphabet.has(symbol), `${entry.id} suggests "${word}", but "${symbol}" is not in Σ`).toBe(true)
        }
      }
    },
  )

  it.each(GALLERY.map((e) => [e.id, e] as const))('%s runs its suggestions cleanly', (_id, entry) => {
    for (const word of entry.suggested) {
      const result = simulateDFA(entry.machine, word)
      // NFAs and ε-NFAs are simulated by their own functions; only check the DFAs here.
      if (entry.machine.kind !== 'DFA') continue
      expect(isOk(result), `${entry.id} failed on "${word}"`).toBe(true)
      if (isOk(result)) assertTraceInvariants(result.value)
    }
  })

  it('has unique ids', () => {
    expect(new Set(GALLERY.map((e) => e.id)).size).toBe(GALLERY.length)
  })

  it('is looked up by id', () => {
    expect(galleryEntry('dfa-contains-01')?.title).toContain('contains 01')
    expect(galleryEntry('no-such-preset')).toBeUndefined()
  })
})

describe('divisibleBy — the residue-class construction', () => {
  /** The value of a numeral, with the empty string worth 0. */
  function valueOf(word: Sym[], base: number): number {
    return word.reduce((acc, digit) => acc * base + parseInt(digit, 36), 0)
  }

  it.each([
    [3, 10, 3],
    [5, 10, 3],
    [7, 10, 3],
  ])('divisible by %s in base %s, checked against arithmetic', (divisor, base, maxLength) => {
    const machine = divisibleBy(divisor, base)
    for (const word of allStringsUpTo(machine.alphabet, maxLength)) {
      const expected = valueOf(word, base) % divisor === 0
      expect(accepts(machine, word.join('')), `"${word.join('')}" base ${base} mod ${divisor}`).toBe(expected)
    }
  })

  it.each([
    [3, 2, 8],
    [4, 2, 8],
  ])('divisible by %s in base %s, checked against arithmetic', (divisor, base, maxLength) => {
    const machine = divisibleBy(divisor, base)
    for (const word of allStringsUpTo(machine.alphabet, maxLength)) {
      const expected = valueOf(word, base) % divisor === 0
      expect(accepts(machine, word.join('')), `"${word.join('')}" base ${base} mod ${divisor}`).toBe(expected)
    }
  })

  it('accepts the empty string, since the construction starts in residue 0', () => {
    expect(accepts(divisibleBy(3), '')).toBe(true)
  })

  it('has one state per residue and is complete', () => {
    const machine = divisibleBy(7, 10)
    expect(machine.states).toHaveLength(7)
    expect(machine.transitions).toHaveLength(70)
    expect(validateFA(machine).ok).toBe(true)
  })

  it('lays residues out on a ring, since that is what the transitions are', () => {
    const machine = divisibleBy(4, 2)
    const positions = machine.states.map((s) => machine.layout?.[s])
    expect(positions.every((p) => p !== undefined)).toBe(true)
    // Four states on a circle occupy four distinct points.
    expect(new Set(positions.map((p) => `${p?.x},${p?.y}`)).size).toBe(4)
  })

  it('agrees with the independent oracle as well as with arithmetic', () => {
    const machine = divisibleBy(3, 2)
    for (const word of allStringsUpTo(machine.alphabet, 9)) {
      expect(accepts(machine, word.join(''))).toBe(bruteForceMembership(machine, word))
    }
  })

  it('is deterministic — the same arguments build the same machine', () => {
    expect(JSON.stringify(divisibleBy(5, 10))).toBe(JSON.stringify(divisibleBy(5, 10)))
  })

  it.each([
    [0, 10],
    [-3, 10],
    [2.5, 10],
  ])('rejects a divisor of %s', (divisor, base) => {
    expect(() => divisibleBy(divisor, base)).toThrow(RangeError)
  })

  it.each([[1, 3], [37, 3], [2.5, 3]])("rejects base %s", (base, divisor) => {
    expect(() => divisibleBy(divisor, base)).toThrow(RangeError)
  })
})
