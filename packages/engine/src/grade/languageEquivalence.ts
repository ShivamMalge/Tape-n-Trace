/**
 * Grading a constructed machine by language equivalence — phases.md P1.1.
 *
 * The feature no DSA visualiser can have: regular-language equivalence is
 * decidable, so a construction exercise is graded *exactly*, and a wrong answer
 * gets the shortest string it fails on rather than a score.
 *
 * Two rules the grader enforces on itself:
 *
 * - **Any correct machine passes.** Grading never compares structure, state
 *   names or state counts — only language. A student who found a different but
 *   correct automaton is right, full stop.
 * - **Minimality is a bonus, never a failure.** "Correct, and minimal" versus
 *   "correct, but 6 states — the minimal DFA has 4". The second is still a pass.
 *
 * The §4.4.2 precondition is handled here, not pushed onto the student: BFS over
 * the product guarantees the *shortest* witness only for complete DFAs, so both
 * machines are determinised, completed and widened to a common alphabet before
 * the product runs. A student may submit a DFA, an NFA or an ε-NFA.
 */

import { equivalence } from '../fa/equivalence.js'
import { nfaToDfa } from '../fa/subset.js'
import { minimize } from '../fa/minimize.js'
import { simulateDFA } from '../fa/simulate.js'
import { completeDFA, validateFA } from '../validate.js'
import { err, ok, validationError, type Result } from '../result.js'
import type { FiniteAutomaton, Sym } from '../types.js'

export type LanguageGrade =
  | {
      verdict: 'correct'
      /** True when the student's machine is as small as any DFA can be. */
      minimal: boolean
      stateCount: number
      minimalStateCount: number
    }
  | {
      verdict: 'wrong'
      /** The shortest string the two machines disagree on. */
      witness: string
      /** Who accepts it — the direction is what makes the feedback readable. */
      side: 'student-accepts' | 'reference-accepts'
      /** One sentence of exam-language feedback, built from witness and side. */
      explanation: string
    }

/**
 * Grade a student's machine against the reference.
 *
 * Errors are the *student's* validation problems (all of them, per §4) — a
 * broken reference is a programmer error and throws via `unwrap` upstream in
 * the CI test that checks every reference against its own grader.
 */
export function gradeLanguage(
  student: FiniteAutomaton,
  reference: FiniteAutomaton,
): Result<LanguageGrade> {
  const validated = validateFA(student)
  if (!validated.ok) return validated

  // One alphabet for both. A student who used a subset of the symbols has not
  // made an error — their machine simply rejects everything mentioning the
  // rest, which widening + completing represents faithfully.
  const alphabet = [...new Set([...student.alphabet, ...reference.alphabet])].sort()
  const problems = student.alphabet.some((s) => !reference.alphabet.includes(s))
    ? [
        validationError(
          'ALPHABET_BEYOND_EXERCISE',
          `The machine uses symbols the exercise's alphabet {${reference.alphabet.join(', ')}} does not contain.`,
          { kind: 'machine' },
        ),
      ]
    : []
  if (problems.length > 0) return err(problems)

  const studentDfa = canonicalise(student, alphabet)
  const referenceDfa = canonicalise(reference, alphabet)
  if (studentDfa === null || referenceDfa === null) {
    return err([
      validationError('GRADER_CANONICALISATION_FAILED', 'The machine could not be determinised.', {
        kind: 'machine',
      }),
    ])
  }

  const compared = equivalence(studentDfa, referenceDfa)
  if (!compared.ok) return compared

  const outcome = compared.value.result
  if (outcome.type !== 'verdict') {
    return err([
      validationError(
        'GRADER_INCOMPLETE',
        'The comparison was stopped by a size guard before reaching a verdict.',
        { kind: 'machine' },
      ),
    ])
  }

  if (outcome.holds) {
    const minimalCount = minimalStateCountOf(referenceDfa)
    return ok({
      verdict: 'correct',
      minimal: student.states.length <= minimalCount,
      stateCount: student.states.length,
      minimalStateCount: minimalCount,
    })
  }

  const witness = (outcome.witness as string | undefined) ?? ''
  const studentAccepts = accepts(studentDfa, witness)
  const shown = witness === '' ? 'the empty string' : `"${witness}"`

  return ok({
    verdict: 'wrong',
    witness,
    side: studentAccepts ? 'student-accepts' : 'reference-accepts',
    explanation: studentAccepts
      ? `Your machine accepts ${shown}, but ${shown} is not in the language.`
      : `Your machine rejects ${shown}, but ${shown} is in the language.`,
  })
}

/**
 * Whether two machines accept the same language, with the detail a caller
 * needs. The convenience form of `gradeLanguage` with the roles symmetric.
 */
export function areEquivalentDetailed(
  a: FiniteAutomaton,
  b: FiniteAutomaton,
): Result<{ equivalent: true } | { equivalent: false; witness: string; side: 'A accepts, B rejects' | 'B accepts, A rejects' }> {
  const graded = gradeLanguage(a, b)
  if (!graded.ok) return graded

  if (graded.value.verdict === 'correct') return ok({ equivalent: true })
  return ok({
    equivalent: false,
    witness: graded.value.witness,
    side: graded.value.side === 'student-accepts' ? 'A accepts, B rejects' : 'B accepts, A rejects',
  })
}

/** Determinise if needed, widen to the shared alphabet, complete. */
function canonicalise(fa: FiniteAutomaton, alphabet: Sym[]): FiniteAutomaton | null {
  let dfa: FiniteAutomaton
  if (fa.kind === 'DFA') {
    dfa = fa
  } else {
    const determinised = nfaToDfa(fa)
    if (!determinised.ok || determinised.value.result.type !== 'machine') return null
    dfa = determinised.value.result.machine as FiniteAutomaton
  }
  return completeDFA({ ...dfa, alphabet: [...alphabet] })
}

/** The state count no correct DFA can beat, from the minimised reference. */
function minimalStateCountOf(referenceDfa: FiniteAutomaton): number {
  const minimal = minimize(referenceDfa)
  return minimal.ok && minimal.value.result.type === 'machine'
    ? (minimal.value.result.machine as FiniteAutomaton).states.length
    : referenceDfa.states.length
}

function accepts(dfa: FiniteAutomaton, word: string): boolean {
  const run = simulateDFA(dfa, word)
  return run.ok && run.value.result.type === 'acceptance' && run.value.result.accepted
}
