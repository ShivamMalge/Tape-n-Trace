/**
 * Canonical naming — architecture.md §4.
 *
 * Determinism is a correctness property (§2.5): grading compares a student's
 * trace to a reference trace, and a conversion that named its states differently
 * on two runs would make every comparison meaningless.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  canonicalRenaming,
  compareStateIds,
  faTransitionId,
  freshStateId,
  parseSubsetStateName,
  productStateName,
  sortStateIds,
  subsetStateName,
} from '../src/index.js'
import { fcParams } from './helpers/seed.js'

describe('compareStateIds', () => {
  it('orders digit runs numerically, the way a student writes them', () => {
    expect(sortStateIds(['q10', 'q2', 'q1'])).toEqual(['q1', 'q2', 'q10'])
  })

  it('is a total order — distinct ids never tie', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        if (a === b) return compareStateIds(a, b) === 0
        return compareStateIds(a, b) !== 0
      }),
      fcParams,
    )
  })

  it('is antisymmetric', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        return Math.sign(compareStateIds(a, b)) === -Math.sign(compareStateIds(b, a))
      }),
      fcParams,
    )
  })

  it('sorts identically however the input was ordered', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string(), { maxLength: 8 }), (ids) => {
        const forward = sortStateIds(ids)
        const backward = sortStateIds([...ids].reverse())
        expect(backward).toEqual(forward)
      }),
      fcParams,
    )
  })
})

describe('subsetStateName', () => {
  it('is sorted, comma-joined, brace-wrapped regardless of argument order', () => {
    expect(subsetStateName(['q1', 'q0', 'q2'])).toBe('{q0,q1,q2}')
    expect(subsetStateName(['q2', 'q1', 'q0'])).toBe('{q0,q1,q2}')
  })

  it('names the empty set {} — the engine emits no display glyphs', () => {
    expect(subsetStateName([])).toBe('{}')
  })

  it('treats the argument as a set', () => {
    expect(subsetStateName(['q1', 'q1', 'q0'])).toBe('{q0,q1}')
  })

  it('round-trips through parseSubsetStateName', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.constantFrom('q0', 'q1', 'q2', 'q3'), { maxLength: 4 }), (ids) => {
        const parsed = parseSubsetStateName(subsetStateName(ids))
        expect(parsed).toEqual(sortStateIds(ids))
      }),
      fcParams,
    )
  })

  it('returns null for a name that is not a subset name', () => {
    expect(parseSubsetStateName('q0')).toBeNull()
  })
})

describe('faTransitionId', () => {
  it('encodes epsilon as empty brackets, never as a glyph', () => {
    expect(faTransitionId('q0', null, 'q1')).toBe('q0-[]->q1')
  })

  it('cannot collide with a symbol transition, even on an alphabet containing "ε"', () => {
    expect(faTransitionId('q0', 'ε', 'q1')).not.toBe(faTransitionId('q0', null, 'q1'))
  })

  it('is stable — the same triple always produces the same id', () => {
    expect(faTransitionId('q0', 'a', 'q1')).toBe(faTransitionId('q0', 'a', 'q1'))
  })
})

describe('productStateName', () => {
  it('keeps argument order, since A x B is not B x A', () => {
    expect(productStateName('p', 'q')).toBe('(p,q)')
    expect(productStateName('q', 'p')).toBe('(q,p)')
  })
})

describe('canonicalRenaming', () => {
  it('maps the i-th state to q<i>, in the order given', () => {
    expect(canonicalRenaming(['{q0,q1}', '{q2}'])).toEqual({ '{q0,q1}': 'q0', '{q2}': 'q1' })
  })
})

describe('freshStateId', () => {
  it('returns the base when it is free', () => {
    expect(freshStateId('qTrap', ['q0', 'q1'])).toBe('qTrap')
  })

  it('suffixes until it finds a free name', () => {
    expect(freshStateId('qTrap', ['qTrap', 'qTrap1'])).toBe('qTrap2')
  })
})
