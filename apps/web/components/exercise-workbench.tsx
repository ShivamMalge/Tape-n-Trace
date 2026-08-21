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
    <div style={{ display: 'grid', gap: 16 }}>
      {exercise.grader === 'manual' ? (
        <ManualNote exercise={exercise} />
      ) : exercise.kind === 'construct-re' ? (
        <RegexAttempt exercise={exercise} />
      ) : (
        <MachineAttempt exercise={exercise} />
      )}

      {exercise.hints.length > 0 ? (
        <section className="tnt-card" style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Hints</h2>
          {exercise.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14 }}>
              {i + 1}. {hint}
            </p>
          ))}
          {hintsShown < exercise.hints.length ? (
            <button type="button" onClick={() => setHintsShown((n) => n + 1)} style={hintButton}>
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
      <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
        Draw your machine over {`{${alphabet.join(', ')}}`}, then grade it.
        {exercise.kind === 'construct-nfa'
          ? ' An NFA is fine — it is determinised before comparison.'
          : ''}
      </p>

      <MachineEditor initial={machine} onMachineChange={setMachine} />

      <button type="button" onClick={() => setOutcome(gradeMachine(exercise, machine))} style={gradeButton}>
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
      <label style={{ display: 'grid', gap: 5 }}>
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          Your regular expression (union +, star *, ε, ∅)
        </span>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          style={{
            fontFamily: 'var(--tnt-mono)',
            fontSize: 17,
            padding: '8px 10px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-bg)',
            color: 'var(--tnt-text)',
          }}
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
        style={gradeButton}
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
      <div role="status" style={banner('var(--tnt-accepting)')}>
        <strong style={{ color: 'var(--tnt-accepting)', fontSize: 15 }}>
          Correct{grade.minimal ? ', and minimal' : ''} — any machine for this language accepts exactly
          what yours does.
        </strong>
        {grade.minimal ? null : (
          <span style={{ fontSize: 13 }}>
            Yours has {grade.stateCount} states; the minimal DFA has {grade.minimalStateCount}. Still
            full marks — see the <a href="/convert/minimize">minimisation stepper</a> for how to shrink
            it.
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div role="status" style={banner('var(--tnt-marked)')}>
        <strong style={{ color: 'var(--tnt-marked)', fontSize: 15 }}>Not yet.</strong>
        <span style={{ fontSize: 14 }}>{grade.explanation}</span>
        <span className="tnt-muted" style={{ fontSize: 12 }}>
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
    <div className="tnt-card" style={{ display: 'grid', gap: 6 }}>
      <strong style={{ fontSize: 14 }}>Marked by hand.</strong>
      <p className="tnt-muted" style={{ margin: 0, fontSize: 13 }}>
        {exercise.kind === 'pumping'
          ? 'A pumping-lemma proof is a quantifier game, and the game version of this exercise arrives with the pumping-lemma feature. Until then, write the proof and check it against the hints.'
          : 'This is a prose question — no honest automatic grader exists for it, so the tool does not pretend to have one. Write your answer as you would in the exam, then use the hints to check yourself.'}
      </p>
    </div>
  )
}

function banner(color: string): React.CSSProperties {
  return {
    display: 'grid',
    gap: 5,
    padding: '11px 14px',
    borderRadius: 'var(--tnt-radius)',
    border: `1px solid ${color}`,
    background: 'var(--tnt-surface)',
  }
}

const gradeButton: React.CSSProperties = {
  justifySelf: 'start',
  padding: '9px 18px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-current)',
  background: 'var(--tnt-current)',
  color: '#fff',
  fontSize: 15,
  cursor: 'pointer',
}

const hintButton: React.CSSProperties = {
  justifySelf: 'start',
  padding: '5px 12px',
  borderRadius: 'var(--tnt-radius)',
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
  fontSize: 13,
  cursor: 'pointer',
}
