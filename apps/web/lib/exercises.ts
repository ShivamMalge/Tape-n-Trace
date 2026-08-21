/**
 * The exercise schema and its grading dispatch — phases.md P1.1.
 *
 * Exercises are data, not code: prompts, tags and references, all sourced from
 * the department's own question bank and model papers with `source` recorded on
 * each. Grading behaviour by kind (from the phase spec):
 *
 * - construct-dfa / construct-nfa / construct-re grade by **language
 *   equivalence** — never structure — so any correct machine passes, and the
 *   feedback is the shortest witness string.
 * - explain questions carry `grader: 'manual'` rather than a faked check;
 *   roughly a third of the bank is CL2 prose and pretending to grade it would
 *   be worse than saying so.
 */

import { gradeLanguage, isOk } from '@tape-n-trace/engine'
import type { FiniteAutomaton, LanguageGrade, Result, Sym } from '@tape-n-trace/engine'
import { buildPlayground } from './playground'
import { topicById } from './topics'

export type ExerciseKind =
  | 'construct-dfa'
  | 'construct-nfa'
  | 'construct-re'
  | 'convert'
  | 'minimize'
  | 'mcq'
  | 'pumping'
  | 'explain'

export type Grader = 'language-equivalence' | 'trace-match' | 'sample' | 'exact' | 'manual'

/** What a construction exercise measures against. */
export type Reference =
  | { kind: 'machine'; machine: FiniteAutomaton }
  | { kind: 'regex'; source: string; alphabet: Sym[] }
  | { kind: 'none' }

export interface Exercise {
  id: string
  /** A TopicId — NOT a module number. The module comes from the topic graph. */
  topic: string
  prompt: string
  kind: ExerciseKind
  reference: Reference
  grader: Grader
  /** Revealed progressively, one at a time. */
  hints: string[]
  /** The real SEE / question-bank mark values. */
  marks: 5 | 6 | 8
  bloom: 'CL1' | 'CL2' | 'CL3' | 'CL4'
  co: 'CO1' | 'CO2' | 'CO3' | 'CO4' | 'CO5'
  /** Position in a 20-mark SEE question (6/6/8). */
  part?: 'a' | 'b' | 'c'
  /** "Question Bank #34" | "Model QP Set 1, Q5c" | "Generated — QB #3/#5 family" */
  source: string
}

/** The alphabet the student's editor should open with. */
export function exerciseAlphabet(exercise: Exercise): Sym[] {
  switch (exercise.reference.kind) {
    case 'machine':
      return exercise.reference.machine.alphabet
    case 'regex':
      return exercise.reference.alphabet
    case 'none':
      return []
  }
}

/** Resolve a reference to the DFA the grader compares against. */
export function referenceDfa(exercise: Exercise): FiniteAutomaton | null {
  switch (exercise.reference.kind) {
    case 'machine':
      return exercise.reference.machine
    case 'regex':
      return buildPlayground(exercise.reference.source, exercise.reference.alphabet).dfa
    case 'none':
      return null
  }
}

/** Grade a constructed machine. `null` when the exercise is not auto-gradable. */
export function gradeMachine(
  exercise: Exercise,
  student: FiniteAutomaton,
): Result<LanguageGrade> | null {
  if (exercise.grader !== 'language-equivalence') return null
  const reference = referenceDfa(exercise)
  return reference === null ? null : gradeLanguage(student, reference)
}

/** Grade a construct-re answer by converting both expressions to DFAs. */
export function gradeRegex(exercise: Exercise, source: string): Result<LanguageGrade> | null {
  if (exercise.grader !== 'language-equivalence') return null
  const reference = referenceDfa(exercise)
  if (reference === null) return null

  const built = buildPlayground(source, exerciseAlphabet(exercise))
  if (built.errors.length > 0) return { ok: false, errors: built.errors }
  if (built.dfa === null) return null
  return gradeLanguage(built.dfa, reference)
}

/**
 * CIE scopes, per the phase spec: CIE-I covers the first 40–50% of the syllabus
 * and CIE-II 85–90%, because that is when the internal tests actually fall.
 * With five equal modules that is modules 1–2 and modules 1–4.
 */
export const CIE_SCOPES = {
  'CIE-I': [1, 2],
  'CIE-II': [1, 2, 3, 4],
} as const

export type CieScope = keyof typeof CIE_SCOPES

export function inCieScope(exercise: Exercise, scope: CieScope): boolean {
  const topic = topicById(exercise.topic)
  return topic !== undefined && (CIE_SCOPES[scope] as readonly number[]).includes(topic.module)
}

export function moduleOf(exercise: Exercise): number | null {
  return topicById(exercise.topic)?.module ?? null
}

/** True when the exercise's own reference would pass its own grader. */
export function referenceGradesItself(exercise: Exercise): boolean {
  if (exercise.grader !== 'language-equivalence') return true

  const reference = referenceDfa(exercise)
  if (reference === null) return false
  const graded = gradeLanguage(reference, reference)
  return isOk(graded) && graded.value.verdict === 'correct'
}
