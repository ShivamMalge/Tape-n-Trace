import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EXERCISES, exerciseById } from '../../../content/exercises'
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

export default async function ExercisePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params
  const exercise = exerciseById(id)
  if (exercise === undefined) notFound()

  const topic = topicById(exercise.topic)

  return (
    <div className="tnt-page">
      <p className="tnt-sm" style={{ margin: 0 }}>
        <a href="/practice">← All exercises</a>
      </p>

      <div className="tnt-row" style={{ margin: 'var(--tnt-space-3) 0' }}>
        {[
          `${exercise.marks} marks`,
          exercise.bloom,
          exercise.co,
          topic === undefined ? null : `Module ${moduleOf(topic.id) ?? '?'} · ${topic.title}`,
          exercise.source,
        ]
          .filter((tag): tag is string => tag !== null)
          .map((tag) => (
            <span key={tag} className="tnt-tag">
              {tag}
            </span>
          ))}
      </div>

      <p className="tnt-prose tnt-lg" style={{ whiteSpace: 'pre-line' }}>{exercise.prompt}</p>

      <ExerciseWorkbench key={exercise.id} exercise={exercise} />
    </div>
  )
}
