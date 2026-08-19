/**
 * ADR-002 — epsilon is `null`, not the string "ε".
 *
 * The decision is mostly enforced by the type system. What is left to test is
 * the readability helper, and the property that made the ADR necessary in the
 * first place: an alphabet may legitimately contain a symbol spelled "ε", and
 * that symbol must not be mistaken for an ε-transition.
 */

import { describe, expect, it } from 'vitest'
import { isEpsilon } from '../src/index.js'
import type { Read } from '../src/index.js'

describe('isEpsilon', () => {
  it('recognises null as epsilon', () => {
    expect(isEpsilon(null)).toBe(true)
  })

  it('does not treat any symbol as epsilon, including "ε" itself', () => {
    expect(isEpsilon('a')).toBe(false)
    expect(isEpsilon('ε')).toBe(false)
    expect(isEpsilon('')).toBe(false)
  })

  it('narrows the type, which is the point of the helper', () => {
    const read: Read = null as Read
    if (isEpsilon(read)) {
      // Inside this branch `read` is `null`; a symbol would not compile here.
      expect(read).toBeNull()
    }
  })
})
