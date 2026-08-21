/**
 * Grading a performed procedure by trace comparison — phases.md P1.1.
 *
 * A conversion exercise is not "did you reach the right machine" but "did you
 * perform the procedure", and the procedure is a trace. Comparing the student's
 * trace against the reference and reporting the **first divergent step** turns
 * "wrong" into "here is the exact step where you went wrong", which is the
 * feedback a marker writes in the margin.
 *
 * Snapshots are compared, not narrations: prose wording is presentation, the
 * artifact state is the mathematics.
 */

import type { Step, Trace } from '../types.js'

export type TraceMatch =
  | { matches: true; steps: number }
  | {
      matches: false
      /** The first step index at which the two traces disagree. */
      index: number
      /** What the reference did at that step, in its own words. */
      expected: string
      /** What the student's trace did instead — absent if it ended early. */
      actual: string | null
    }

export function compareTraces(student: Trace, reference: Trace): TraceMatch {
  const shared = Math.min(student.steps.length, reference.steps.length)

  for (let i = 0; i < shared; i++) {
    const a = student.steps[i] as Step
    const b = reference.steps[i] as Step
    if (JSON.stringify(a.snapshot) !== JSON.stringify(b.snapshot)) {
      return { matches: false, index: i, expected: b.narration, actual: a.narration }
    }
  }

  if (student.steps.length !== reference.steps.length) {
    const index = shared
    return {
      matches: false,
      index,
      expected:
        reference.steps[index]?.narration ??
        'The procedure should have ended here, but the submitted trace continues.',
      actual: student.steps[index]?.narration ?? null,
    }
  }

  return { matches: true, steps: reference.steps.length }
}
