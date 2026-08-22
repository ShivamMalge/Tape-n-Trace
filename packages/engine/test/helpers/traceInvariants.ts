/**
 * The shared trace-invariant helper — architecture.md §5 and §11.3.
 *
 * One helper, applied to every trace-producing function in the engine. When a
 * new phase adds a trace kind, it adds a case to `collectIds` here rather than
 * writing its own invariant checks — which is why `collectIds` throws on a
 * highlight it cannot resolve instead of skipping it. A skipped check is a check
 * that quietly stops holding.
 */

import { expect } from 'vitest'
import type { Highlight, Step, Trace, TraceResult } from '../../src/index.js'

const PLACEHOLDER_MARKERS = ['TODO', 'FIXME', 'XXX', 'lorem ipsum', '<placeholder>', 'undefined', 'NaN']

export interface TraceInvariantOptions {
  /**
   * Checks the final snapshot against the declared result. Trace-kind specific,
   * so it is supplied by the caller; the default understands any snapshot that
   * carries a `status` field, which covers every simulation trace.
   *
   * Return `true` when consistent, or a string explaining the inconsistency.
   */
  finalSnapshotMatchesResult?: (snapshot: unknown, result: TraceResult) => boolean | string
}

/** Assert all six trace invariants from architecture.md §5. */
export function assertTraceInvariants(trace: Trace<Step<unknown>>, options: TraceInvariantOptions = {}): void {
  assertContiguousIndices(trace)
  assertNarrations(trace)
  assertHighlightsResolve(trace)
  assertJsonRoundTrip(trace)
  assertResultConsistency(trace, options)
  assertStepCount(trace)
}

/** 1. Step indices are contiguous from 0. */
function assertContiguousIndices(trace: Trace<Step<unknown>>): void {
  trace.steps.forEach((step, i) => {
    expect(step.index, `step at position ${i} carries index ${step.index}`).toBe(i)
  })
}

/** 2. Every narration is non-empty, ends in a period, and holds no placeholder text. */
function assertNarrations(trace: Trace<Step<unknown>>): void {
  for (const step of trace.steps) {
    const where = `${trace.kind} step ${step.index}`

    expect(step.narration.trim(), `${where} has an empty narration`).not.toBe('')
    expect(step.narration.trimEnd().endsWith('.'), `${where} narration must end in a period: "${step.narration}"`).toBe(true)

    for (const marker of PLACEHOLDER_MARKERS) {
      expect(
        step.narration.toLowerCase().includes(marker.toLowerCase()),
        `${where} narration contains placeholder text "${marker}": "${step.narration}"`,
      ).toBe(false)
    }
  }
}

/** 3. Every highlight references an id that exists in that step's snapshot. */
function assertHighlightsResolve(trace: Trace<Step<unknown>>): void {
  for (const step of trace.steps) {
    const ids = collectIds(step.snapshot, `${trace.kind} step ${step.index}`)

    for (const h of step.highlight) {
      const where = `${trace.kind} step ${step.index} highlight ${h.type}`

      switch (h.type) {
        case 'state':
          expect(ids.states.has(h.id), `${where} names state "${h.id}", absent from the snapshot`).toBe(true)
          break
        case 'transition':
          expect(ids.transitions.has(h.id), `${where} names transition "${h.id}", absent from the snapshot`).toBe(true)
          break
        case 'treeNode':
          expect(ids.treeNodes.has(h.id), `${where} names tree node "${h.id}", absent from the snapshot`).toBe(true)
          break
        case 'input':
          expect(
            h.position >= 0 && h.position < ids.inputLength,
            `${where} names input position ${h.position}, outside 0..${ids.inputLength - 1}`,
          ).toBe(true)
          break
        case 'symbolSet':
          // A symbol set may name automaton states (ε-closures) or grammar
          // symbols (generating / reachable / nullable) — `labels` pools both.
          for (const id of h.ids) {
            expect(ids.labels.has(id), `${where} names "${id}", absent from the snapshot`).toBe(true)
          }
          break
        case 'production':
          expect(
            h.index >= 0 && h.index < ids.productionCount,
            `${where} names production ${h.index}, outside 0..${ids.productionCount - 1}`,
          ).toBe(true)
          break
        case 'tableCell':
          // A table's axes vary by conversion — subsets against symbols, states
          // against states, pairs against pairs — so what is checked is that
          // both labels name something the snapshot actually contains.
          expect(ids.labels.has(h.row), `${where} names row "${h.row}", absent from the snapshot`).toBe(true)
          expect(ids.labels.has(h.col), `${where} names column "${h.col}", absent from the snapshot`).toBe(true)
          break
        default:
          throw new Error(
            `assertTraceInvariants cannot resolve a "${(h as Highlight).type}" highlight yet. ` +
              'Extend collectIds() in test/helpers/traceInvariants.ts before shipping the phase that emits it.',
          )
      }
    }
  }
}

/** 4. The trace round-trips through JSON.stringify / parse unchanged. */
function assertJsonRoundTrip(trace: Trace<Step<unknown>>): void {
  const round = JSON.parse(JSON.stringify(trace)) as unknown
  expect(round, `${trace.kind} does not survive a JSON round-trip`).toEqual(trace)
}

/** 5. The final snapshot is consistent with the declared result. */
function assertResultConsistency(trace: Trace<Step<unknown>>, options: TraceInvariantOptions): void {
  const last = trace.steps.at(-1)
  expect(last, `${trace.kind} produced no steps`).toBeDefined()
  if (last === undefined) return

  const check = options.finalSnapshotMatchesResult ?? defaultConsistency
  const verdict = check(last.snapshot, trace.result)
  expect(verdict, typeof verdict === 'string' ? verdict : `${trace.kind} final snapshot contradicts its result`).toBe(true)
}

/**
 * Understands any snapshot carrying a `status` of 'accepted' | 'rejected', which
 * is every simulation trace. A trace whose result is not an acceptance verdict
 * must pass its own checker.
 */
function defaultConsistency(snapshot: unknown, result: TraceResult): boolean | string {
  const status = (snapshot as { status?: unknown }).status

  // A run stopped by a §9 guard must say so in both places. Reporting it as a
  // rejection in either one would be the silent cap §9 calls a defect.
  if (result.type === 'incomplete') {
    return (
      status === 'stopped' ||
      `the result is incomplete but the final snapshot has status ${JSON.stringify(status)}, expected 'stopped'`
    )
  }

  // A conversion's final snapshot must actually hold the machine it claims to
  // have produced. A trace that says "here is your DFA" while its last frame
  // shows a half-built one is the exact failure the invariant exists to catch.
  if (result.type === 'machine') {
    // Most conversions call the thing they are building `target`; a grammar
    // snapshot calls its automaton `machine`, because there the grammar is the
    // other half of the pair. Either name counts.
    const built = (snapshot as { target?: unknown; machine?: unknown }).target ??
      (snapshot as { machine?: unknown }).machine
    if (status !== 'done') {
      return `the result is a machine but the final snapshot has status ${JSON.stringify(status)}, expected 'done'`
    }
    return (
      JSON.stringify(built) === JSON.stringify(result.machine) ||
      'the final snapshot differs from the machine the trace returned'
    )
  }

  if (result.type === 'grammar') {
    if (status !== 'done') {
      return `the result is a grammar but the final snapshot has status ${JSON.stringify(status)}, expected 'done'`
    }
    return (
      JSON.stringify((snapshot as { grammar?: unknown }).grammar) === JSON.stringify(result.grammar) ||
      'the final snapshot differs from the grammar the trace returned'
    )
  }

  if (result.type === 'regex') {
    if (status !== 'done') {
      return `the result is a regex but the final snapshot has status ${JSON.stringify(status)}, expected 'done'`
    }
    return true
  }

  if (result.type === 'verdict') {
    const expected = result.holds ? 'equivalent' : 'different'
    return (
      status === expected ||
      `the verdict is holds=${result.holds} but the final snapshot has status ${JSON.stringify(status)}`
    )
  }

  if (result.type !== 'acceptance') {
    return `no default consistency check exists for a "${result.type}" result — pass finalSnapshotMatchesResult`
  }

  if (status !== 'accepted' && status !== 'rejected') {
    return `the final snapshot has status ${JSON.stringify(status)}, expected 'accepted' or 'rejected'`
  }

  const agrees = (status === 'accepted') === result.accepted
  return agrees || `final snapshot says ${status} but the result says accepted=${result.accepted}`
}

/** 6. meta.stepCount === steps.length. */
function assertStepCount(trace: Trace<Step<unknown>>): void {
  expect(trace.meta.stepCount, `${trace.kind} meta.stepCount disagrees with steps.length`).toBe(trace.steps.length)
}

interface SnapshotIds {
  states: Set<string>
  transitions: Set<string>
  treeNodes: Set<string>
  /** Anything a table axis may legally be labelled with. */
  labels: Set<string>
  /** How many productions the snapshot's grammar holds. */
  productionCount: number
  inputLength: number
}

interface MachineLike {
  states?: string[]
  alphabet?: string[]
  transitions?: { id: string }[]
}

/**
 * Gather the ids a highlight may legally name. Extended per phase, as the
 * snapshots each phase introduces arrive.
 *
 * A conversion snapshot holds more than one machine — a source and a growing
 * target, or the two machines being compared — and a highlight carries no field
 * saying which one it means (§5). Ids are therefore pooled across all of them.
 * That is deliberate rather than sloppy: for ε-elimination, where source and
 * target share state names, highlighting a state in both panes is exactly right.
 */
function collectIds(snapshot: unknown, where: string): SnapshotIds {
  if (snapshot === null || typeof snapshot !== 'object') {
    throw new Error(`${where} has a non-object snapshot; highlights cannot be resolved against it.`)
  }

  const s = snapshot as Record<string, unknown> & {
    nodes?: { id: string }[]
    grammar?: { productions?: unknown[]; variables?: string[]; terminals?: string[] }
    table?: { name?: string }[]
    states?: string[]
    input?: unknown[]
  }

  // Machines are found by shape, not by field name. Conversions have called
  // theirs `machine`, `source`, `target`, `machineA`/`machineB` and
  // `left`/`right` across five phases, and an allowlist meant every new one
  // silently resolved no ids until a test failed. Shape does not drift.
  const machines = Object.values(s).filter(isMachineLike)

  const states = new Set(machines.flatMap((m) => m.states ?? []))
  const transitions = new Set(machines.flatMap((m) => (m.transitions ?? []).map((t) => t.id)))

  const labels = new Set<string>([
    ...states,
    ...machines.flatMap((m) => m.alphabet ?? []),
    ...(s.table ?? []).flatMap((row) => (row.name === undefined ? [] : [row.name])),
    ...(s.states ?? []),
    ...(s.grammar?.variables ?? []),
    ...(s.grammar?.terminals ?? []),
  ])

  return {
    states,
    transitions,
    labels,
    productionCount: s.grammar?.productions?.length ?? 0,
    treeNodes: new Set((s.nodes ?? []).map((n) => n.id)),
    inputLength: s.input?.length ?? 0,
  }
}

/** A machine is anything carrying a state list and a transition list. */
function isMachineLike(value: unknown): value is MachineLike {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as MachineLike
  return Array.isArray(candidate.states) && Array.isArray(candidate.transitions)
}

/** Assert that every snapshot in a trace is frozen, per ADR-001. */
export function assertSnapshotsFrozen(trace: Trace<Step<unknown>>): void {
  for (const step of trace.steps) {
    expect(Object.isFrozen(step.snapshot), `${trace.kind} step ${step.index} snapshot is not frozen`).toBe(true)
  }
}
