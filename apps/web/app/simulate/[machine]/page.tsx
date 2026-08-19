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
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/simulate">← All machines</a>
      </p>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>{entry.title}</h1>
      <p style={{ maxWidth: '62ch', marginTop: 0 }}>{entry.language}</p>

      {/* The triad: controller (state + engine), renderer (inside it), docs. */}
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)',
          alignItems: 'start',
          marginTop: 20,
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
