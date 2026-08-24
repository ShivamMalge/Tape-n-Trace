import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GALLERY, galleryEntry } from '@tape-n-trace/engine'
import { AutomatonController } from '../../../components/automaton-controller'
import { AutomatonDocs } from '../../../components/automaton-docs'

interface PageProps {
  params: Promise<{ machine: string }>
}

/** Every preset is a static route — the gallery is the list, and it is finite. */
export function generateStaticParams(): { machine: string }[] {
  return GALLERY.map((entry) => ({ machine: entry.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { machine } = await params
  const entry = galleryEntry(machine)
  return entry === undefined
    ? { title: 'Machine not found' }
    : { title: entry.title, description: entry.language }
}

export default async function SimulateMachinePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { machine } = await params
  const entry = galleryEntry(machine)
  if (entry === undefined) notFound()

  return (
    <div className="tnt-page">
      <p className="tnt-sm" style={{ margin: 0 }}>
        <a href="/simulate">← All machines</a>
      </p>

      <h1 style={{ marginTop: 'var(--tnt-space-2)' }}>{entry.title}</h1>
      <p className="tnt-prose" style={{ marginTop: 0 }}>{entry.language}</p>

      {/* The triad: controller (state + engine), renderer (inside it), docs. */}
      <div
        className="tnt-stack-lg"
        style={{
          gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)',
          alignItems: 'start',
          marginTop: 'var(--tnt-space-5)',
        }}
      >
        <AutomatonController
          key={entry.id}
          machine={entry.machine}
          suggested={entry.suggested}
          initialInput={entry.suggested[0] ?? ''}
        />
        <AutomatonDocs machine={entry.machine} />
      </div>
    </div>
  )
}
