/**
 * Reading a simulation snapshot.
 *
 * Snapshots are `unknown` in the trace protocol on purpose — a trace of a CNF
 * conversion and a trace of a TM run have nothing in common (§5). Narrowing them
 * is the controller's job, not the renderer's, so it happens here rather than
 * inside a component.
 */

import type { DFASnapshot, ENFASnapshot, NFASnapshot, Step } from '@tape-n-trace/engine'

/** The three FA simulation snapshots, seen through what they share. */
export type AnySnapshot = (DFASnapshot | NFASnapshot | ENFASnapshot) & {
  /** Present only on an NFA branch-tree snapshot. */
  nodes?: NFASnapshot['nodes']
}

/**
 * Narrow a step's snapshot to an FA simulation snapshot, or `null` if it is
 * something else. Never throws: a page handed the wrong kind of trace should
 * render without a diagram rather than crash.
 */
export function snapshotOf(step: Step | null | undefined): AnySnapshot | null {
  if (step === null || step === undefined) return null
  const snapshot = step.snapshot
  if (snapshot === null || typeof snapshot !== 'object') return null

  const candidate = snapshot as Partial<AnySnapshot>
  if (candidate.machine === undefined || !Array.isArray(candidate.input)) return null
  if (typeof candidate.position !== 'number') return null

  return candidate as AnySnapshot
}
