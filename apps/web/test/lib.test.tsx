/**
 * The app's own logic: label parsing, the `.tnt` format, and the undo stack.
 *
 * None of this is the engine, and all of it is somewhere a wrong answer is
 * silent — a label that parses to nothing, a file that loads as an empty
 * machine, an undo that swallows a whole drag.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { dfaContains01, emptyMachine, moveState, toggleAccepting } from '@tape-n-trace/engine'
import { containsEpsilon, formatEdgeLabel, parseEdgeLabel } from '../lib/edge-labels'
import { parseTntJson, toTntJson } from '../lib/export'
import { useMachineHistory } from '../lib/use-machine-history'

afterEach(cleanup)

describe('edge labels', () => {
  it('splits on commas and trims', () => {
    expect(parseEdgeLabel('0, 1')).toEqual(['0', '1'])
    expect(parseEdgeLabel('  0 ,1  ')).toEqual(['0', '1'])
  })

  it('accepts every reasonable spelling of epsilon, since the glyph is hard to type', () => {
    for (const spelling of ['ε', 'e', 'eps', 'EPS', 'epsilon', 'lambda', 'λ', '^']) {
      expect(parseEdgeLabel(spelling), spelling).toEqual([null])
    }
  })

  it('keeps a multi-character symbol that is not an epsilon spelling', () => {
    expect(parseEdgeLabel('ab')).toEqual(['ab'])
  })

  it('parses an empty label to nothing, which is how an edge is deleted', () => {
    expect(parseEdgeLabel('')).toEqual([])
    expect(parseEdgeLabel('  ,  ')).toEqual([])
  })

  it('round-trips through formatting', () => {
    const reads = ['0', null, '1']
    expect(parseEdgeLabel(formatEdgeLabel(reads))).toEqual(reads)
  })

  it('reports whether epsilon is involved, so the editor can warn before it is an error', () => {
    expect(containsEpsilon(parseEdgeLabel('0, eps'))).toBe(true)
    expect(containsEpsilon(parseEdgeLabel('0, 1'))).toBe(false)
  })
})

describe('the .tnt format', () => {
  it('round-trips a machine', () => {
    const parsed = parseTntJson(toTntJson(dfaContains01))
    expect(parsed).toEqual({ machine: dfaContains01 })
  })

  it('explains a file that is not JSON', () => {
    expect(parseTntJson('not json at all')).toEqual({ error: expect.stringContaining('valid JSON') })
  })

  it('refuses a JSON file that is not one of ours', () => {
    expect(parseTntJson('{"hello":true}')).toEqual({ error: expect.stringContaining('format header') })
  })

  it('refuses a header with no machine behind it', () => {
    const text = JSON.stringify({ format: 'tape-n-trace/machine@1' })
    expect(parseTntJson(text)).toEqual({ error: expect.stringContaining('no machine') })
  })

  it('carries a trace alongside the machine when given one', () => {
    const withTrace = JSON.parse(
      toTntJson(dfaContains01, { kind: 'simulate.dfa', engineVersion: '0.1.0', input: {}, steps: [], result: { type: 'acceptance', accepted: true }, meta: { stepCount: 0, counters: {} } }),
    ) as { trace?: unknown }
    expect(withTrace.trace).toBeDefined()
  })

  it('omits the trace key entirely when there is none', () => {
    expect(JSON.parse(toTntJson(dfaContains01))).not.toHaveProperty('trace')
  })
})

describe('undo history', () => {
  it('starts with nothing to undo', () => {
    const { result } = renderHook(() => useMachineHistory(emptyMachine()))
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('undoes and redoes a change', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))

    act(() => result.current.commit(toggleAccepting(dfaContains01, 'q0')))
    expect(result.current.machine.accepting).toContain('q0')
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    expect(result.current.machine.accepting).not.toContain('q0')
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect(result.current.machine.accepting).toContain('q0')
  })

  /**
   * A drag emits a commit per pointer move. Without coalescing, undoing a drag
   * would rewind it one pixel at a time — which is not what anyone means by undo.
   */
  it('collapses one drag into one undo entry', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))

    act(() => {
      for (let x = 100; x <= 140; x += 10) {
        result.current.commit(moveState(result.current.machine, 'q0', { x, y: 90 }), {
          coalesce: 'move:q0',
        })
      }
    })
    expect(result.current.machine.layout?.['q0']).toEqual({ x: 140, y: 90 })

    act(() => result.current.undo())
    expect(result.current.machine.layout?.['q0']).toEqual(dfaContains01.layout?.['q0'])
    expect(result.current.canUndo).toBe(false)
  })

  it('starts a new entry when a different gesture begins', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))

    act(() => result.current.commit(moveState(dfaContains01, 'q0', { x: 5, y: 5 }), { coalesce: 'move:q0' }))
    act(() => result.current.commit(moveState(result.current.machine, 'q1', { x: 7, y: 7 }), { coalesce: 'move:q1' }))

    act(() => result.current.undo())
    expect(result.current.machine.layout?.['q1']).toEqual(dfaContains01.layout?.['q1'])
    expect(result.current.machine.layout?.['q0']).toEqual({ x: 5, y: 5 })
  })

  it('drops the redo branch once a new change is made', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))

    act(() => result.current.commit(toggleAccepting(dfaContains01, 'q0')))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.commit(toggleAccepting(result.current.machine, 'q1')))
    expect(result.current.canRedo).toBe(false)
  })

  it('reset clears the history, as loading a different machine should', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))

    act(() => result.current.commit(toggleAccepting(dfaContains01, 'q0')))
    act(() => result.current.reset(emptyMachine()))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.machine.states).toEqual(['q0'])
  })

  it('ignores a commit of the machine it already holds', () => {
    const { result } = renderHook(() => useMachineHistory(dfaContains01))
    act(() => result.current.commit(dfaContains01))
    expect(result.current.canUndo).toBe(false)
  })
})
