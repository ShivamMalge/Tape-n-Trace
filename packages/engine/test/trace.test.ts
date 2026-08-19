/**
 * The trace protocol — architecture.md §5 and ADR-001.
 *
 * Two things are being defended here. First, that a snapshot cannot be mutated
 * after the fact, because a trace whose history can change is not a trace.
 * Second, that consecutive snapshots *share* structure rather than being copied,
 * because ADR-001's whole argument is that deep-cloning breaks at the §9 caps.
 */

import { describe, expect, it } from 'vitest'
import {
  deepFreeze,
  deserialise,
  ENGINE_VERSION,
  EngineInvariantError,
  LIMITS,
  serialise,
  TraceBuilder,
} from '../src/index.js'
import type { Trace } from '../src/index.js'

interface Counter {
  machine: { states: string[]; transitions: { id: string }[] }
  input: string[]
  value: number
  status: 'running' | 'accepted' | 'rejected'
}

const machine = { states: ['q0', 'q1'], transitions: [{ id: 't0' }] }

function buildCountingTrace(steps: number): Trace {
  const builder = new TraceBuilder<Counter>('simulate.dfa', { steps })
  let snapshot: Counter = { machine, input: ['0'], value: 0, status: 'running' }

  builder.step({ narration: 'Start counting at zero.', snapshot })

  for (let i = 1; i <= steps; i++) {
    // Structural extension, never a deep clone (§14).
    snapshot = { ...snapshot, value: i, status: i === steps ? 'accepted' : 'running' }
    builder.step({ narration: `Increment to ${i}.`, snapshot })
    builder.bump('increments')
  }

  return builder.build({ type: 'acceptance', accepted: true }) as Trace
}

describe('TraceBuilder', () => {
  it('numbers steps contiguously from 0 and reports the count in meta', () => {
    const trace = buildCountingTrace(3)
    expect(trace.steps.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(trace.meta.stepCount).toBe(4)
  })

  it('stamps the engine version', () => {
    expect(buildCountingTrace(1).engineVersion).toBe(ENGINE_VERSION)
  })

  it('accumulates counters', () => {
    expect(buildCountingTrace(3).meta.counters).toEqual({ increments: 3 })
  })

  it('leaves meta.truncated absent unless a guard fired', () => {
    expect(buildCountingTrace(1).meta).not.toHaveProperty('truncated')
  })

  it('records the first truncation and keeps it', () => {
    const builder = new TraceBuilder<Counter>('simulate.nfa', {})
    builder.step({ narration: 'Start.', snapshot: { machine, input: [], value: 0, status: 'running' } })
    expect(builder.truncated).toBe(false)

    builder.truncate('first reason', 10)
    builder.truncate('second reason', 20)

    const trace = builder.build({ type: 'acceptance', accepted: false })
    expect(builder.truncated).toBe(true)
    expect(trace.meta.truncated).toEqual({ reason: 'first reason', cap: 10 })
  })

  it('omits an absent citation rather than storing undefined', () => {
    const builder = new TraceBuilder<Counter>('simulate.dfa', {})
    builder.step({ narration: 'No citation here.', snapshot: { machine, input: [], value: 0, status: 'running' } })
    expect(builder.build({ type: 'acceptance', accepted: false }).steps[0]).not.toHaveProperty('citation')
  })

  it('rejects a narration that does not end in a period', () => {
    const builder = new TraceBuilder<Counter>('simulate.dfa', {})
    expect(() =>
      builder.step({ narration: 'no period here', snapshot: { machine, input: [], value: 0, status: 'running' } }),
    ).toThrow(EngineInvariantError)
  })

  it('rejects an empty narration', () => {
    const builder = new TraceBuilder<Counter>('simulate.dfa', {})
    expect(() =>
      builder.step({ narration: '   ', snapshot: { machine, input: [], value: 0, status: 'running' } }),
    ).toThrow(EngineInvariantError)
  })

  it('rejects placeholder text in a narration', () => {
    const builder = new TraceBuilder<Counter>('simulate.dfa', {})
    expect(() =>
      builder.step({ narration: 'TODO explain this.', snapshot: { machine, input: [], value: 0, status: 'running' } }),
    ).toThrow(/placeholder/)
  })
})

describe('snapshots are frozen — ADR-001', () => {
  it('freezes every snapshot on the way in', () => {
    for (const step of buildCountingTrace(3).steps) {
      expect(Object.isFrozen(step.snapshot)).toBe(true)
    }
  })

  it('freezes nested structures, not just the top level', () => {
    const trace = buildCountingTrace(1)
    const snapshot = trace.steps[0]?.snapshot as Counter
    expect(Object.isFrozen(snapshot.machine)).toBe(true)
    expect(Object.isFrozen(snapshot.machine.states)).toBe(true)
  })

  it('throws on a mutation attempt, so a shared substructure cannot be rewritten', () => {
    const trace = buildCountingTrace(1)
    const snapshot = trace.steps[0]?.snapshot as Counter
    expect(() => {
      ;(snapshot as { value: number }).value = 99
    }).toThrow(TypeError)
    expect(() => snapshot.machine.states.push('q2')).toThrow(TypeError)
  })

  it('shares unchanged substructure between consecutive steps', () => {
    const trace = buildCountingTrace(3)
    const first = trace.steps[0]?.snapshot as Counter
    const last = trace.steps[3]?.snapshot as Counter

    // The whole point of ADR-001: the machine is one object, not four copies.
    expect(last.machine).toBe(first.machine)
    expect(last.input).toBe(first.input)
    expect(last.value).not.toBe(first.value)
  })
})

describe('deepFreeze', () => {
  it('returns primitives untouched', () => {
    expect(deepFreeze(42)).toBe(42)
    expect(deepFreeze(null)).toBeNull()
  })

  it('terminates on a cycle', () => {
    const a: Record<string, unknown> = {}
    a['self'] = a
    expect(() => deepFreeze(a)).not.toThrow()
    expect(Object.isFrozen(a)).toBe(true)
  })

  it('skips an already-frozen substructure, which is what keeps freezing O(what changed)', () => {
    const shared = Object.freeze({ deep: { untouched: true } })
    deepFreeze({ shared })
    // `deep` sits under an already-frozen parent, so the walk stopped there.
    expect(Object.isFrozen(shared.deep)).toBe(false)
  })
})

describe('serialisation', () => {
  it('round-trips a trace', () => {
    const trace = buildCountingTrace(5)
    expect(deserialise(serialise(trace))).toEqual(trace)
  })

  it('rehydrates complete snapshots, never deltas (§5)', () => {
    const restored = deserialise(serialise(buildCountingTrace(3)))
    const last = restored.steps[3]?.snapshot as Counter
    expect(last.machine.states).toEqual(['q0', 'q1'])
    expect(last.value).toBe(3)
  })

  it('restores structural sharing rather than duplicating', () => {
    const restored = deserialise(serialise(buildCountingTrace(3)))
    const first = restored.steps[0]?.snapshot as Counter
    const last = restored.steps[3]?.snapshot as Counter
    expect(last.machine).toBe(first.machine)
  })

  it('freezes what it rehydrates', () => {
    const restored = deserialise(serialise(buildCountingTrace(2)))
    expect(Object.isFrozen(restored.steps[0]?.snapshot)).toBe(true)
  })

  it('collapses shared structure — a long trace is far smaller than its steps suggest', () => {
    const short = serialise(buildCountingTrace(10))
    const long = serialise(buildCountingTrace(200))

    // 20x the steps. Deep-cloned snapshots would grow at least 20x with them;
    // sharing means only the changed field is paid for per step.
    expect(long.length).toBeLessThan(short.length * 20)
  })

  it('truncates past the byte budget and says so, rather than capping silently (§9)', () => {
    const trace = buildCountingTrace(500)
    const restored = deserialise(serialise(trace, { maxBytes: 2_000 }))

    expect(restored.steps.length).toBeLessThan(trace.steps.length)
    expect(restored.meta.stepCount).toBe(restored.steps.length)
    expect(restored.meta.truncated?.cap).toBe(2_000)
    expect(restored.meta.truncated?.reason).toMatch(/budget/)
  })

  it('leaves a trace inside the budget untruncated', () => {
    const restored = deserialise(serialise(buildCountingTrace(5), { maxBytes: LIMITS.TRACE_BYTES }))
    expect(restored.meta).not.toHaveProperty('truncated')
  })

  it('rejects an unknown wire format', () => {
    expect(() => deserialise(JSON.stringify({ format: 'something-else', root: null, heap: [] }))).toThrow(
      EngineInvariantError,
    )
  })

  it('rejects a value it cannot put on the wire', () => {
    const builder = new TraceBuilder<unknown>('simulate.dfa', { fn: () => 1 })
    builder.step({ narration: 'Start.', snapshot: { status: 'accepted' } })
    expect(() => serialise(builder.build({ type: 'acceptance', accepted: true }))).toThrow(
      EngineInvariantError,
    )
  })
})
