/**
 * The error channel — architecture.md §4.
 *
 * The contract worth defending: user error is a value, programmer error is an
 * exception, and the two never swap places.
 */

import { describe, expect, it } from 'vitest'
import {
  allOf,
  EngineInvariantError,
  err,
  isErr,
  isOk,
  mapResult,
  ok,
  unwrap,
  validationError,
} from '../src/index.js'
import type { Result } from '../src/index.js'

const boom = validationError('BOOM', 'Something is wrong with the machine.', { kind: 'machine' })

describe('Result', () => {
  it('narrows with isOk and isErr', () => {
    expect(isOk(ok(1))).toBe(true)
    expect(isErr(ok(1))).toBe(false)
    expect(isOk(err([boom]))).toBe(false)
    expect(isErr(err([boom]))).toBe(true)
  })

  it('validationError builds the shape the editor points at', () => {
    expect(validationError('CODE', 'Message.', { kind: 'state', id: 'q0' })).toEqual({
      code: 'CODE',
      message: 'Message.',
      subject: { kind: 'state', id: 'q0' },
    })
  })
})

describe('unwrap', () => {
  it('returns the value on success', () => {
    expect(unwrap(ok(42))).toBe(42)
  })

  it('throws EngineInvariantError on failure — this is programmer error, not user error', () => {
    expect(() => unwrap(err([boom]))).toThrow(EngineInvariantError)
  })

  it('names every error in the thrown message, so the cause is not guesswork', () => {
    const second = validationError('SECOND', 'And another thing.', { kind: 'machine' })
    expect(() => unwrap(err([boom, second]))).toThrow(/BOOM.*SECOND/s)
  })
})

describe('allOf', () => {
  it('collects the values when everything succeeded', () => {
    expect(allOf([ok(1), ok(2), ok(3)])).toEqual({ ok: true, value: [1, 2, 3] })
  })

  it('keeps every error rather than stopping at the first', () => {
    const other = validationError('OTHER', 'A second problem.', { kind: 'machine' })
    const result = allOf([ok(1), err<number>([boom]), err<number>([other])])
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.errors.map((e) => e.code)).toEqual(['BOOM', 'OTHER'])
  })

  it('succeeds vacuously on an empty list', () => {
    expect(allOf([])).toEqual({ ok: true, value: [] })
  })
})

describe('mapResult', () => {
  it('maps the success case', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 })
  })

  it('leaves errors untouched and does not run the function', () => {
    let ran = false
    const failed: Result<number> = err([boom])
    const mapped = mapResult(failed, (n) => {
      ran = true
      return n
    })
    expect(ran).toBe(false)
    expect(mapped).toEqual(failed)
  })
})
