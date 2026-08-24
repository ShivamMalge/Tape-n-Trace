/**
 * The language-class map — phases.md P1.7.
 *
 * The rings must nest, every language plotted must name a ring that exists, and
 * the two facts §9.2.2 actually proves — Theorems 9.3 and 9.4 — must be the ones
 * the closure table and the placement table report. The rows the book sets as an
 * exercise rather than proving are held to saying so.
 */

import { describe, expect, it } from 'vitest'
import {
  CANONICAL_LANGUAGES,
  COMPLEMENT_PLACEMENTS,
  LANGUAGE_CLASSES,
  RECURSIVE_RE_CLOSURE,
  UNWITNESSED_SEPARATION,
  languageClass,
} from '../src/index.js'

describe('the rings — Fig. 9.2, extended inwards', () => {
  it('nests strictly, innermost first', () => {
    expect(LANGUAGE_CLASSES.map((c) => c.depth)).toEqual([0, 1, 2, 3, 4, 5])
    expect(LANGUAGE_CLASSES.map((c) => c.id)).toEqual(['regular', 'cfl', 'csl', 'recursive', 're', 'all'])
    expect(new Set(LANGUAGE_CLASSES.map((c) => c.id)).size).toBe(LANGUAGE_CLASSES.length)
  })

  it('gives every ring a machine and a closure summary', () => {
    for (const c of LANGUAGE_CLASSES) {
      expect(c.machine, c.id).toBeTruthy()
      expect(c.closure, c.id).toBeTruthy()
      expect(c.decision, c.id).toBeTruthy()
    }
  })

  it('cites every ring the prescribed sections cover, and claims nothing for the one they do not', () => {
    for (const c of LANGUAGE_CLASSES) {
      if (c.id === 'csl') {
        expect(c.citation, 'the CSLs are outside the section list, so nothing may be claimed').toBeNull()
      } else {
        expect(c.citation, c.id).toMatch(/^\d/)
      }
    }
  })

  it('carries a pumping lemma exactly where the course has one', () => {
    expect(languageClass('regular')?.pumping).toMatch(/Theorem 4\.1/)
    expect(languageClass('cfl')?.pumping).toMatch(/Theorem 7\.18/)
    for (const id of ['csl', 'recursive', 're', 'all'] as const) {
      expect(languageClass(id)?.pumping, id).toBeUndefined()
    }
  })
})

describe('the languages plotted on it', () => {
  it('every one names a ring that exists', () => {
    for (const l of CANONICAL_LANGUAGES) {
      expect(languageClass(l.ring), `${l.id} is placed in "${l.ring}"`).toBeDefined()
      expect(l.why, l.id).toBeTruthy()
      expect(l.notation, l.id).toBeTruthy()
    }
    expect(new Set(CANONICAL_LANGUAGES.map((l) => l.id)).size).toBe(CANONICAL_LANGUAGES.length)
  })

  it('witnesses every separation the course proves, and admits the one it does not', () => {
    const occupied = new Set(CANONICAL_LANGUAGES.map((l) => l.ring))
    for (const c of LANGUAGE_CLASSES) {
      if (c.id === UNWITNESSED_SEPARATION.outer) {
        expect(occupied.has(c.id), 'the recursive ring has no standard witness, and must not pretend to').toBe(false)
      } else {
        expect(occupied.has(c.id), `nothing is plotted in the ${c.id} ring`).toBe(true)
      }
    }
    expect(languageClass(UNWITNESSED_SEPARATION.inner)).toBeDefined()
    expect(UNWITNESSED_SEPARATION.why).toMatch(/proper/)
  })

  it('places L_d outside every ring and L_u in the RE one, as Fig. 9.2 draws them', () => {
    expect(CANONICAL_LANGUAGES.find((l) => l.id === 'l-d')?.ring).toBe('all')
    expect(CANONICAL_LANGUAGES.find((l) => l.id === 'complement-l-u')?.ring).toBe('all')
    expect(CANONICAL_LANGUAGES.find((l) => l.id === 'l-u')?.ring).toBe('re')
    expect(CANONICAL_LANGUAGES.find((l) => l.id === 'complement-l-d')?.ring).toBe('re')
  })

  it('cites every placement', () => {
    for (const l of CANONICAL_LANGUAGES) expect(l.citation, l.id).toMatch(/^\d/)
  })
})

describe('closure for the recursive and RE languages — §9.2.2, Exercise 9.2.6', () => {
  it('answers every operation the exercise asks about', () => {
    expect(RECURSIVE_RE_CLOSURE.map((r) => r.op)).toEqual([
      'Union',
      'Intersection',
      'Concatenation',
      'Kleene closure',
      'Complement',
      'Homomorphism',
      'Inverse homomorphism',
    ])
  })

  it('gives every cell a construction or a counterexample', () => {
    for (const row of RECURSIVE_RE_CLOSURE) {
      expect(row.recursiveWhy.length, row.op).toBeGreaterThan(40)
      expect(row.reWhy.length, row.op).toBeGreaterThan(20)
      expect(row.citation, row.op).toMatch(/^9\.2/)
    }
  })

  it('marks as printed only the row the book actually proves', () => {
    const printed = RECURSIVE_RE_CLOSURE.filter((r) => r.source === 'printed')
    expect(printed.map((r) => r.op)).toEqual(['Complement'])
    for (const row of RECURSIVE_RE_CLOSURE) {
      if (row.source === 'exercise') expect(row.citation, row.op).toMatch(/Exercise 9\.2\.6/)
    }
  })

  it('reports the two results the book proves, and the two failures it names', () => {
    const complement = RECURSIVE_RE_CLOSURE.find((r) => r.op === 'Complement')
    expect(complement?.recursive).toBe('closed')
    expect(complement?.recursiveWhy).toMatch(/Theorem 9\.3/)
    expect(complement?.re).toBe('not-closed')
    expect(complement?.reWhy).toMatch(/Theorem 9\.4/)

    const homomorphism = RECURSIVE_RE_CLOSURE.find((r) => r.op === 'Homomorphism')
    expect(homomorphism?.recursive).toBe('not-closed')
    expect(homomorphism?.re).toBe('closed')
    // The distinction that makes the failure make sense: erasing is what breaks it.
    expect(homomorphism?.recursiveWhy).toMatch(/never erases/)
  })

  it('is closed under everything else, in both classes', () => {
    for (const row of RECURSIVE_RE_CLOSURE) {
      if (row.op === 'Complement' || row.op === 'Homomorphism') continue
      expect(row.recursive, row.op).toBe('closed')
      expect(row.re, row.op).toBe('closed')
    }
  })
})

describe('where a language and its complement can sit — §9.2.2, p. 377', () => {
  it('covers all nine placements', () => {
    expect(COMPLEMENT_PLACEMENTS).toHaveLength(9)
    const rings = ['recursive', 're-not-recursive', 'not-re']
    for (const a of rings) {
      for (const b of rings) {
        expect(
          COMPLEMENT_PLACEMENTS.some((p) => p.language === a && p.complement === b),
          `${a} with ${b}`,
        ).toBe(true)
      }
    }
  })

  it('allows exactly the four the book allows', () => {
    const possible = COMPLEMENT_PLACEMENTS.filter((p) => p.possible)
    expect(possible).toHaveLength(4)
    expect(possible.map((p) => `${p.language}/${p.complement}`).sort()).toEqual(
      [
        'not-re/not-re',
        'not-re/re-not-recursive',
        're-not-recursive/not-re',
        'recursive/recursive',
      ].sort(),
    )
  })

  it('blames the right theorem for each impossibility', () => {
    for (const p of COMPLEMENT_PLACEMENTS.filter((x) => !x.possible)) {
      expect(p.why, `${p.language}/${p.complement}`).toMatch(/Theorem 9\.[34]/)
    }
    // Theorem 9.4 rules out exactly one: both RE, neither recursive.
    const byNine4 = COMPLEMENT_PLACEMENTS.filter((p) => !p.possible && /Theorem 9\.4/.test(p.why))
    expect(byNine4.map((p) => `${p.language}/${p.complement}`)).toEqual(['re-not-recursive/re-not-recursive'])
  })
})
