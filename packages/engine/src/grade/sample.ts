/**
 * Grading by bounded sample — phases.md P1.1.
 *
 * For CFGs, PDAs and TMs exact equivalence is undecidable, so the honest grade
 * is a bounded check that *says it is bounded*. The caveat is not small print:
 * "this is a sample check, not a proof" is itself the lesson (§2.6), and every
 * result from this module carries the bound it searched to.
 */

import { allStringsUpTo } from '../strings.js'
import type { BoundedClaim, Sym } from '../types.js'

/** The sentence the UI must show beside any sample-based grade. */
export const SAMPLE_CAVEAT =
  'This is a sample check, not a proof: the two agree on every string up to the bound, which is evidence, not equivalence. For grammars and machines beyond regular, no algorithm can do better — equivalence is undecidable.'

export type SampleGrade =
  | { agrees: true; checked: number; bounded: BoundedClaim }
  | {
      agrees: false
      /** The shortest string the two disagree on within the bound. */
      witness: string
      side: 'student-accepts' | 'reference-accepts'
      checked: number
      bounded: BoundedClaim
    }

/**
 * Compare two membership predicates over every string up to `maxLength`.
 *
 * Predicates rather than machines, so the same grader serves an FA today and a
 * CFG's bounded derivation check in P1.3 without changing shape. Shortest-first
 * enumeration makes the witness the shortest one in the bound.
 */
export function sampleCompare(
  student: (word: Sym[]) => boolean,
  reference: (word: Sym[]) => boolean,
  alphabet: readonly Sym[],
  maxLength: number,
): SampleGrade {
  const bounded: BoundedClaim = { searchedUpTo: maxLength, unit: 'inputLength' }
  let checked = 0

  for (const word of allStringsUpTo(alphabet, maxLength)) {
    checked += 1
    const inStudent = student(word)
    const inReference = reference(word)
    if (inStudent !== inReference) {
      return {
        agrees: false,
        witness: word.join(''),
        side: inStudent ? 'student-accepts' : 'reference-accepts',
        checked,
        bounded,
      }
    }
  }

  return { agrees: true, checked, bounded }
}
