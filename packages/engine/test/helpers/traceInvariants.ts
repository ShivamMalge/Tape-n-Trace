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
          for (const id of h.ids) {
            expect(ids.states.has(id), `${where} names "${id}", absent from the snapshot`).toBe(true)
          }
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
  inputLength: number
}

/**
 * Gather the ids a highlight may legally name. Extended per phase, as the
 * snapshots each phase introduces arrive.
 */
function collectIds(snapshot: unknown, where: string): SnapshotIds {
  if (snapshot === null || typeof snapshot !== 'object') {
    throw new Error(`${where} has a non-object snapshot; highlights cannot be resolved against it.`)
  }

  const s = snapshot as {
    machine?: { states?: string[]; transitions?: { id: string }[] }
    nodes?: { id: string }[]
    input?: unknown[]
  }

  return {
    states: new Set(s.machine?.states ?? []),
    transitions: new Set((s.machine?.transitions ?? []).map((t) => t.id)),
    treeNodes: new Set((s.nodes ?? []).map((n) => n.id)),
    inputLength: s.input?.length ?? 0,
  }
}

/** Assert that every snapshot in a trace is frozen, per ADR-001. */
export function assertSnapshotsFrozen(trace: Trace<Step<unknown>>): void {
  for (const step of trace.steps) {
    expect(Object.isFrozen(step.snapshot), `${trace.kind} step ${step.index} snapshot is not frozen`).toBe(true)
  }
}
