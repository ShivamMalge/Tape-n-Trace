/**
 * The exercise bank invariants — phases.md P1.1.
 *
 * These are CI gates on *content*, which is where course material rots: a typo
 * in a topic id, a reference that stopped matching its own grader after an
 * engine change, a module with no coverage. Each failure names the exercise.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { divisibleBy } from '@tape-n-trace/engine'
import { EXERCISES, exerciseById } from '../content/exercises'
import {
  inCieScope,
  moduleOf,
  referenceDfa,
  referenceGradesItself,
  gradeMachine,
} from '../lib/exercises'
import { TOPICS, topicById } from '../lib/topics'
import { CompareView } from '../components/compare-view'
import { ExerciseWorkbench } from '../components/exercise-workbench'

afterEach(cleanup)

describe('the bank, as a whole', () => {
  it('ships at least 60 exercises', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60)
  })

  it('spans every module of the default scheme', () => {
    const modules = new Set(EXERCISES.map(moduleOf))
    expect([...modules].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('has unique ids', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  })

  it('every exercise keys on a topic the graph knows', () => {
    for (const exercise of EXERCISES) {
      expect(topicById(exercise.topic), `${exercise.id} points at unknown topic "${exercise.topic}"`).toBeDefined()
    }
  })

  it('marks, bloom and co are present and legal on every exercise', () => {
    for (const exercise of EXERCISES) {
      expect([5, 6, 8], `${exercise.id} marks`).toContain(exercise.marks)
      expect(exercise.bloom, `${exercise.id} bloom`).toMatch(/^CL[1-4]$/)
      expect(exercise.co, `${exercise.id} co`).toMatch(/^CO[1-5]$/)
      expect(exercise.source.length, `${exercise.id} has no source`).toBeGreaterThan(3)
    }
  })

  /**
   * phases.md P1.1 — every auto-graded exercise's reference passes its own
   * grader, so a broken reference cannot ship.
   */
  it('every auto-graded reference passes its own grader', () => {
    for (const exercise of EXERCISES) {
      expect(referenceGradesItself(exercise), `${exercise.id}'s reference fails its own grader`).toBe(true)
    }
  })

  it('auto-graded exercises resolve a reference DFA; manual ones need none', () => {
    for (const exercise of EXERCISES) {
      if (exercise.grader === 'language-equivalence') {
        expect(referenceDfa(exercise), `${exercise.id} has no usable reference`).not.toBeNull()
      } else {
        expect(exercise.grader, exercise.id).toBe('manual')
      }
    }
  })

  it('the CIE filters carve the bank the way the internals fall', () => {
    const cie1 = EXERCISES.filter((e) => inCieScope(e, 'CIE-I'))
    const cie2 = EXERCISES.filter((e) => inCieScope(e, 'CIE-II'))

    expect(cie1.length).toBeGreaterThan(0)
    expect(cie2.length).toBeGreaterThan(cie1.length)
    expect(cie1.every((e) => [1, 2].includes(moduleOf(e) ?? 0))).toBe(true)
    expect(cie2.every((e) => [1, 2, 3, 4].includes(moduleOf(e) ?? 0))).toBe(true)
  })

  /** phases.md P1.1 — divisible-by-K comes from the generator, not by hand. */
  it('the divisible-by-K family is generated from the preset machines', () => {
    const generated = EXERCISES.filter((e) => e.id.startsWith('gen-div-'))
    expect(generated.length).toBeGreaterThanOrEqual(6)

    for (const exercise of generated) {
      const [, , base, divisor] = exercise.id.split('-')
      expect(exercise.reference.kind).toBe('machine')
      if (exercise.reference.kind !== 'machine') continue
      // The reference IS the preset machine — same generator, same output.
      expect(exercise.reference.machine).toEqual(divisibleBy(Number(divisor), Number(base)))
    }
  })

  it('hints exist on construction exercises, since they are the scaffold', () => {
    for (const exercise of EXERCISES.filter((e) => e.grader === 'language-equivalence')) {
      expect(exercise.hints.length, `${exercise.id} has no hints`).toBeGreaterThan(0)
    }
  })

  it('is looked up by id', () => {
    expect(exerciseById('m1-starts-ab')?.co).toBe('CO1')
    expect(exerciseById('nope')).toBeUndefined()
  })

  it('every topic used exists, and the graph itself has unique ids', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length)
  })
})

describe('grading through the workbench', () => {
  it('a correct reference machine submitted as the answer grades correct', () => {
    const exercise = exerciseById('gen-div-10-3')
    if (exercise === undefined || exercise.reference.kind !== 'machine') throw new Error('missing')

    const graded = gradeMachine(exercise, exercise.reference.machine)
    expect(graded).not.toBeNull()
    if (graded === null || !graded.ok) throw new Error('should grade')
    expect(graded.value.verdict).toBe('correct')
  })

  it('the workbench opens with an editor for a construct exercise', () => {
    const exercise = exerciseById('m1-starts-ab')
    if (exercise === undefined) throw new Error('missing')
    render(<ExerciseWorkbench exercise={exercise} />)

    expect(screen.getByRole('button', { name: /grade my machine/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /add state/i })).toBeDefined()
  })

  it('grading an empty machine yields the witness and the compare view', async () => {
    const user = userEvent.setup()
    const exercise = exerciseById('m1-starts-ab')
    if (exercise === undefined) throw new Error('missing')
    render(<ExerciseWorkbench exercise={exercise} />)

    // The initial machine accepts nothing, so the shortest witness is "ab".
    await user.click(screen.getByRole('button', { name: /grade my machine/i }))

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('rejects "ab"')
    expect(status.textContent).toContain('shortest')
    expect(screen.getByText(/Watch them disagree on "ab"/)).toBeDefined()
  })

  it('reveals hints one at a time', async () => {
    const user = userEvent.setup()
    const exercise = exerciseById('m1-starts-ab')
    if (exercise === undefined) throw new Error('missing')
    render(<ExerciseWorkbench exercise={exercise} />)

    expect(screen.queryByText(/how much of "ab" has been seen/)).toBeNull()
    await user.click(screen.getByRole('button', { name: /show a hint/i }))
    expect(screen.getByText(/how much of "ab" has been seen/)).toBeDefined()
    expect(screen.queryByText(/can never recover/)).toBeNull()
  })

  it('a manual exercise says it is marked by hand rather than faking a grade', () => {
    const exercise = exerciseById('m3-cfg-define')
    if (exercise === undefined) throw new Error('missing')
    render(<ExerciseWorkbench exercise={exercise} />)

    expect(screen.getByText(/Marked by hand/)).toBeDefined()
    expect(screen.queryByRole('button', { name: /grade/i })).toBeNull()
  })
})

describe('the compare view', () => {
  it('runs both machines on the witness and shows opposite verdicts', () => {
    const exercise = exerciseById('m1-length-mod-3')
    if (exercise === undefined || exercise.reference.kind !== 'machine') throw new Error('missing')
    const reference = exercise.reference.machine
    // A machine accepting everything disagrees with |w| mod 3 = 0 on "a".
    const everything = { ...reference, accepting: reference.states }

    render(
      <CompareView
        left={everything}
        right={reference}
        leftLabel="Your machine"
        rightLabel="The answer"
        witness="a"
      />,
    )

    expect(screen.getByText(/Watch them disagree on "a"/)).toBeDefined()
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(2)
    expect(within(headings[0] as HTMLElement).getByText('accepts')).toBeDefined()
    expect(within(headings[1] as HTMLElement).getByText('rejects')).toBeDefined()
    // One transport drives both panes.
    expect(screen.getAllByRole('slider', { name: 'Step' })).toHaveLength(1)
  })
})
