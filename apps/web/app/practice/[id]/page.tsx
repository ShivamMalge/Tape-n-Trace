import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EXERCISES, exerciseById } from '../../../content/exercises'
import { exerciseAlphabet, type Exercise } from '../../../lib/exercises'
import { topicById } from '../../../lib/topics'
import { moduleOf } from '../../../lib/schemes'
import { ExerciseWorkbench } from '../../../components/exercise-workbench'

interface PageProps {
  params: Promise<{ id: string }>
}

export function generateStaticParams(): { id: string }[] {
  return EXERCISES.map((exercise) => ({ id: exercise.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const exercise = exerciseById(id)
  return exercise === undefined
    ? { title: 'Exercise not found' }
    : { title: `Practice — ${exercise.source}` }
}

/** Bloom's levels as the question papers name them. */
const BLOOM: Record<Exercise['bloom'], string> = {
  CL1: 'Remember',
  CL2: 'Understand',
  CL3: 'Apply',
  CL4: 'Analyse',
}

/** The task in one line, from the exercise's kind — design artboard 04's h2. */
function taskTitle(exercise: Exercise): string {
  const sigma = `Σ = {${exerciseAlphabet(exercise).join(', ')}}`
  switch (exercise.kind) {
    case 'construct-dfa':
      return `Construct a DFA over ${sigma}`
    case 'construct-nfa':
      return `Construct an NFA over ${sigma}`
    case 'construct-re':
      return `Write a regular expression over ${sigma}`
    case 'pumping':
      return 'Prove the language is not regular'
    default:
      return 'Answer in prose'
  }
}

export default async function ExercisePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params
  const exercise = exerciseById(id)
  if (exercise === undefined) notFound()

  const topic = topicById(exercise.topic)
  const [first, ...rest] = exercise.prompt.split('\n')

  return (
    <div className="tnt-page">
      <p className="tnt-meta" style={{ margin: '0 0 14px' }}>
        <a href="/practice">← All exercises</a>
      </p>

      <ExerciseWorkbench
        key={exercise.id}
        exercise={exercise}
        header={
          <section className="tnt-card tnt-exercise-card" aria-label="Exercise">
            <div className="tnt-row">
              <span className="tnt-verb">
                {exercise.marks} marks · {exercise.co} · {BLOOM[exercise.bloom]}
              </span>
              <span className="tnt-meta">
                {exercise.source}
                {topic === undefined ? '' : ` · Module ${moduleOf(topic.id) ?? '?'} · ${topic.title}`}
              </span>
            </div>
            <h2 className="tnt-exercise-title">{taskTitle(exercise)}</h2>
            <p className="tnt-exercise-prompt">{first}</p>
            {rest.length === 0 ? null : <p className="tnt-exercise-prompt">{rest.join('\n')}</p>}
          </section>
        }
      />
    </div>
  )
}
