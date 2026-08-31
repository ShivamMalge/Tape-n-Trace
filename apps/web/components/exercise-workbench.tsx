'use client'

/**
 * One exercise: attempt it, grade it, see why — design artboard 04: the
 * exercise card and "Your machine" card on the left; on the right the verdict
 * panel (green when correct, the red "Not equivalent" panel with the shortest
 * disagreement in a mono well when not), a stat row, and the hints as a docs
 * card. The compare view runs both machines on the witness underneath.
 *
 * The feedback rules come straight from the phase spec. A correct machine of any
 * shape passes; minimality is a bonus line, never a failure; a wrong machine
 * gets the shortest witness *and* the compare view showing both machines run it
 * to opposite verdicts. Manual exercises say "marked by hand" instead of
 * pretending.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { emptyMachine, isOk } from '@tape-n-trace/engine'
import type { FiniteAutomaton, LanguageGrade, Result, ValidationError } from '@tape-n-trace/engine'
import { MachineEditor } from './machine-editor'
import { Board } from './board/board'
import { CompareView } from './compare-view'
import { DocsCard } from './docs-card'
import { ValidationErrors } from './validation-errors'
import {
  exerciseAlphabet,
  gradeMachine,
  gradeRegex,
  referenceDfa,
  type Exercise,
} from '../lib/exercises'

export function ExerciseWorkbench({
  exercise,
  header,
}: {
  exercise: Exercise
  /** The exercise card — the prompt, its tags — rendered at the top of the left column. */
  header?: ReactNode
}): React.JSX.Element {
  const [hintsShown, setHintsShown] = useState(0)
  const [outcome, setOutcome] = useState<Result<LanguageGrade> | null>(null)
  const [student, setStudent] = useState<FiniteAutomaton | null>(null)
  const reference = useMemo(() => referenceDfa(exercise), [exercise])

  const grade = outcome !== null && isOk(outcome) ? outcome.value : null

  return (
    <div className="tnt-stack-lg">
      <div className="tnt-exercise">
        <div className="tnt-stack-lg">
          {header}

          {exercise.grader === 'manual' ? (
            <ManualNote exercise={exercise} />
          ) : exercise.kind === 'construct-re' ? (
            <RegexAttempt
              exercise={exercise}
              onGraded={(result, dfa) => {
                setOutcome(result)
                setStudent(dfa)
              }}
            />
          ) : (
            <MachineAttempt
              exercise={exercise}
              onGraded={(result, machine) => {
                setOutcome(result)
                setStudent(machine)
              }}
            />
          )}
        </div>

        <div className="tnt-stack">
          {outcome === null ? null : !isOk(outcome) ? (
            <ValidationErrors errors={outcome.errors as ValidationError[]} />
          ) : grade !== null && grade.verdict === 'correct' ? (
            <div role="status" className="tnt-banner tnt-banner-good tnt-verdict-panel">
              <span className="tnt-banner-headline">Correct{grade.minimal ? ', and minimal' : ''}</span>
              <span className="tnt-banner-detail">
                Any machine for this language accepts exactly what yours does.
                {grade.minimal ? null : (
                  <>
                    {' '}
                    Yours has {grade.stateCount} states; the minimal DFA has {grade.minimalStateCount}. Still full
                    marks — see the <a href="/convert/minimize">minimisation stepper</a> for how to shrink it.
                  </>
                )}
              </span>
            </div>
          ) : grade !== null ? (
            <div role="status" className="tnt-banner tnt-banner-bad tnt-verdict-panel">
              <div className="tnt-verdict-panel-head">
                <span className="tnt-banner-headline">Not equivalent</span>
                <span className="tnt-meta">{exercise.marks} marks · exact grading</span>
              </div>
              <p>Your machine and the reference machine first disagree on the shortest string</p>
              <div className="tnt-witness-well">{grade.witness === '' ? 'ε' : grade.witness}</div>
              <p>
                {grade.explanation} That is the <em>shortest</em> string the two machines disagree on.
              </p>
            </div>
          ) : null}

          {grade !== null && student !== null ? (
            <div className="tnt-card tnt-stats" aria-label="Your machine in numbers">
              <div className="tnt-stat">
                <span className="tnt-stat-value">{student.states.length}</span>
                <span className="tnt-stat-caption">states</span>
              </div>
              <div className="tnt-stat">
                <span className="tnt-stat-value">{student.transitions.length}</span>
                <span className="tnt-stat-caption">moves</span>
              </div>
              <div className="tnt-stat">
                <span className="tnt-stat-value" style={grade.verdict === 'correct' ? undefined : { color: 'var(--tnt-dead)' }}>
                  {grade.verdict === 'correct' ? 0 : 1}
                </span>
                <span className="tnt-stat-caption">disagreement</span>
              </div>
            </div>
          ) : null}

          {exercise.hints.length > 0 ? (
            <DocsCard title="Hints" cite={`${exercise.hints.length} available`} open>
              {exercise.hints.slice(0, hintsShown).map((hint, i) => (
                <p key={i}>
                  {i + 1}. {hint}
                </p>
              ))}
              {hintsShown < exercise.hints.length ? (
                <p>
                  <button type="button" className="tnt-btn" onClick={() => setHintsShown((n) => n + 1)}>
                    {hintsShown === 0 ? 'Show a hint' : 'Another hint'} ({exercise.hints.length - hintsShown} left)
                  </button>
                </p>
              ) : null}
            </DocsCard>
          ) : null}
        </div>
      </div>

      {grade !== null && grade.verdict === 'wrong' && student !== null && reference !== null ? (
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

function MachineAttempt({
  exercise,
  onGraded,
}: {
  exercise: Exercise
  onGraded: (outcome: Result<LanguageGrade> | null, machine: FiniteAutomaton) => void
}): React.JSX.Element {
  const alphabet = exerciseAlphabet(exercise)
  const kind = exercise.kind === 'construct-nfa' ? 'NFA' : 'DFA'
  const [machine, setMachine] = useState<FiniteAutomaton>(() => emptyMachine(kind, alphabet))
  // Two ways to draw the same machine: click by click, or freehand on the
  // classroom board. Each keeps its own drawing; grading takes whichever is showing.
  const [mode, setMode] = useState<'clicks' | 'board'>('clicks')
  const [boardMachine, setBoardMachine] = useState<FiniteAutomaton>(() => emptyMachine(kind, alphabet))
  const drawn = mode === 'board' ? boardMachine : machine

  return (
    <section className="tnt-card" aria-label="Your machine">
      <div className="tnt-card-head">
        <h2 className="tnt-label">
          Your machine
          <span className="tnt-normal"> · over {`{${alphabet.join(', ')}}`}</span>
        </h2>
        <div className="tnt-seg tnt-seg-sm" role="radiogroup" aria-label="How to draw">
          {(['clicks', 'board'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className="tnt-seg-btn" onClick={() => setMode(m)}>
              {m === 'clicks' ? 'Click to draw' : 'Freehand board'}
            </button>
          ))}
        </div>
      </div>
      {exercise.kind === 'construct-nfa' ? (
        <p className="tnt-meta" style={{ margin: '0 0 var(--tnt-space-3)' }}>
          An NFA is fine — it is determinised before comparison.
        </p>
      ) : null}
      <div className="tnt-stack">
        {mode === 'board' ? (
          <Board initial={boardMachine} onChange={setBoardMachine} embedded />
        ) : (
          <MachineEditor initial={machine} onMachineChange={setMachine} />
        )}
        <div>
          <button
            type="button"
            className="tnt-btn tnt-btn-primary"
            onClick={() => onGraded(gradeMachine(exercise, drawn), drawn)}
          >
            Grade my machine
          </button>
        </div>
      </div>
    </section>
  )
}

function RegexAttempt({
  exercise,
  onGraded,
}: {
  exercise: Exercise
  onGraded: (outcome: Result<LanguageGrade> | null, dfa: FiniteAutomaton | null) => void
}): React.JSX.Element {
  const [source, setSource] = useState('')

  return (
    <section className="tnt-card" aria-label="Your expression">
      <div className="tnt-card-head">
        <h2 className="tnt-label">Your regular expression</h2>
        <span className="tnt-meta">union +, star *, ε, ∅</span>
      </div>
      <div className="tnt-input-row">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-label="Your regular expression"
          className="tnt-input tnt-input-mono tnt-input-lg"
        />
        <button
          type="button"
          onClick={() => {
            const graded = gradeRegex(exercise, source)
            onGraded(graded, null)
            // The DFA of the student's expression, for the compare view.
            if (graded !== null && isOk(graded) && graded.value.verdict === 'wrong') {
              import('../lib/playground').then(({ buildPlayground }) => {
                onGraded(graded, buildPlayground(source, exerciseAlphabet(exercise)).dfa)
              })
            }
          }}
          className="tnt-btn tnt-btn-primary"
        >
          Grade my expression
        </button>
      </div>
    </section>
  )
}

function ManualNote({ exercise }: { exercise: Exercise }): React.JSX.Element {
  return (
    <div className="tnt-banner tnt-banner-info">
      <span className="tnt-banner-headline">Marked by hand</span>
      <span className="tnt-banner-detail">
        {exercise.kind === 'pumping'
          ? 'A pumping-lemma proof is a quantifier game; play it on the pumping-lemma page, then write the proof and check it against the hints.'
          : 'This is a prose question — no honest automatic grader exists for it, so the tool does not pretend to have one. Write your answer as you would in the exam, then use the hints to check yourself.'}
      </span>
    </div>
  )
}
