'use client'

/**
 * One exercise: attempt it, grade it, see why.
 *
 * The feedback rules come straight from the phase spec. A correct machine of any
 * shape passes; minimality is a bonus line, never a failure; a wrong machine
 * gets the shortest witness *and* the compare view showing both machines run it
 * to opposite verdicts. Manual exercises say "marked by hand" instead of
 * pretending.
 */

import { useMemo, useState } from 'react'
import { emptyMachine, isOk } from '@tape-n-trace/engine'
import type { FiniteAutomaton, LanguageGrade, Result, ValidationError } from '@tape-n-trace/engine'
import { MachineEditor } from './machine-editor'
import { CompareView } from './compare-view'
import { ValidationErrors } from './validation-errors'
import {
  exerciseAlphabet,
  gradeMachine,
  gradeRegex,
  referenceDfa,
  type Exercise,
} from '../lib/exercises'

export function ExerciseWorkbench({ exercise }: { exercise: Exercise }): React.JSX.Element {
  const [hintsShown, setHintsShown] = useState(0)

  return (
    <div className="tnt-stack">
      {exercise.grader === 'manual' ? (
        <ManualNote exercise={exercise} />
      ) : exercise.kind === 'construct-re' ? (
        <RegexAttempt exercise={exercise} />
      ) : (
        <MachineAttempt exercise={exercise} />
      )}

      {exercise.hints.length > 0 ? (
        <section className="tnt-card tnt-stack-sm">
          <h2 style={{ margin: 0 }}>Hints</h2>
          {exercise.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} style={{ margin: 0 }}>
              {i + 1}. {hint}
            </p>
          ))}
          {hintsShown < exercise.hints.length ? (
            <button
              type="button"
              className="tnt-btn"
              onClick={() => setHintsShown((n) => n + 1)}
              style={{ justifySelf: 'start' }}
            >
              {hintsShown === 0 ? 'Show a hint' : 'Another hint'} ({exercise.hints.length - hintsShown}{' '}
              left)
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function MachineAttempt({ exercise }: { exercise: Exercise }): React.JSX.Element {
  const alphabet = exerciseAlphabet(exercise)
  const kind = exercise.kind === 'construct-nfa' ? 'NFA' : 'DFA'
  const [machine, setMachine] = useState<FiniteAutomaton>(() => emptyMachine(kind, alphabet))
  const [outcome, setOutcome] = useState<Result<LanguageGrade> | null>(null)

  return (
    <>
      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        Draw your machine over {`{${alphabet.join(', ')}}`}, then grade it.
        {exercise.kind === 'construct-nfa'
          ? ' An NFA is fine — it is determinised before comparison.'
          : ''}
      </p>

      <MachineEditor initial={machine} onMachineChange={setMachine} />

      <button
        type="button"
        className="tnt-btn tnt-btn-primary"
        onClick={() => setOutcome(gradeMachine(exercise, machine))}
        style={{ justifySelf: 'start' }}
      >
        Grade my machine
      </button>

      <GradeOutcome exercise={exercise} outcome={outcome} student={machine} />
    </>
  )
}

function RegexAttempt({ exercise }: { exercise: Exercise }): React.JSX.Element {
  const [source, setSource] = useState('')
  const [outcome, setOutcome] = useState<Result<LanguageGrade> | null>(null)
  const [studentDfa, setStudentDfa] = useState<FiniteAutomaton | null>(null)

  return (
    <>
      <label className="tnt-field">
        <span className="tnt-muted">Your regular expression (union +, star *, ε, ∅)</span>
        {/* Set large on purpose — this is the answer being graded, and ε and ∅
            have to be legible. `.tnt-lg` cannot do it: it and `.tnt-input` are
            both one class, and `.tnt-input` comes later in the sheet. */}
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="tnt-input tnt-input-mono tnt-input-lg"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          const graded = gradeRegex(exercise, source)
          setOutcome(graded)
          // The DFA of the student's expression, for the compare view.
          setStudentDfa(null)
          if (graded !== null && isOk(graded) && graded.value.verdict === 'wrong') {
            import('../lib/playground').then(({ buildPlayground }) => {
              setStudentDfa(buildPlayground(source, exerciseAlphabet(exercise)).dfa)
            })
          }
        }}
        className="tnt-btn tnt-btn-primary"
        style={{ justifySelf: 'start' }}
      >
        Grade my expression
      </button>

      <GradeOutcome exercise={exercise} outcome={outcome} student={studentDfa} />
    </>
  )
}

function GradeOutcome({
  exercise,
  outcome,
  student,
}: {
  exercise: Exercise
  outcome: Result<LanguageGrade> | null
  student: FiniteAutomaton | null
}): React.JSX.Element | null {
  const reference = useMemo(() => referenceDfa(exercise), [exercise])
  if (outcome === null) return null

  if (!isOk(outcome)) {
    return <ValidationErrors errors={outcome.errors as ValidationError[]} />
  }

  const grade = outcome.value
  if (grade.verdict === 'correct') {
    return (
      <div role="status" className="tnt-note tnt-note-good tnt-stack-sm">
        <strong style={{ color: 'var(--tnt-accepting)' }}>
          Correct{grade.minimal ? ', and minimal' : ''} — any machine for this language accepts exactly
          what yours does.
        </strong>
        {grade.minimal ? null : (
          <span>
            Yours has {grade.stateCount} states; the minimal DFA has {grade.minimalStateCount}. Still
            full marks — see the <a href="/convert/minimize">minimisation stepper</a> for how to shrink
            it.
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="tnt-stack">
      <div role="status" className="tnt-note tnt-note-warn tnt-stack-sm">
        <strong style={{ color: 'var(--tnt-marked)' }}>Not yet.</strong>
        <span>{grade.explanation}</span>
        <span className="tnt-meta">
          That is the <em>shortest</em> string the two machines disagree on.
        </span>
      </div>

      {student !== null && reference !== null ? (
        <CompareView
          left={student}
          right={reference}
          leftLabel="Your machine"
          rightLabel="The answer"
          witness={grade.witness}
        />
      ) : null}
    </div>
  )
}

function ManualNote({ exercise }: { exercise: Exercise }): React.JSX.Element {
  return (
    <div className="tnt-card tnt-stack-sm">
      <strong>Marked by hand.</strong>
      <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
        {exercise.kind === 'pumping'
          ? 'A pumping-lemma proof is a quantifier game, and the game version of this exercise arrives with the pumping-lemma feature. Until then, write the proof and check it against the hints.'
          : 'This is a prose question — no honest automatic grader exists for it, so the tool does not pretend to have one. Write your answer as you would in the exam, then use the hints to check yourself.'}
      </p>
    </div>
  )
}
