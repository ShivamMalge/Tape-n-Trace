import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EXERCISES, exerciseById } from '../../../content/exercises'
import { topicById } from '../../../lib/topics'
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
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/practice">← All exercises</a>
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {[
          `${exercise.marks} marks`,
          exercise.bloom,
          exercise.co,
          topic === undefined ? null : `Module ${topic.module} · ${topic.title}`,
          exercise.source,
        ]
          .filter((tag): tag is string => tag !== null)
          .map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                padding: '2px 9px',
                borderRadius: 999,
                border: '1px solid var(--tnt-border)',
                background: 'var(--tnt-surface)',
              }}
            >
              {tag}
            </span>
          ))}
      </div>

      <p style={{ fontSize: 17, maxWidth: '68ch', whiteSpace: 'pre-line' }}>{exercise.prompt}</p>

      <ExerciseWorkbench key={exercise.id} exercise={exercise} />
    </div>
  )
}
