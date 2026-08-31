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
      <div className="tnt-page-head">
        <div>
          <p className="tnt-meta" style={{ margin: '0 0 6px' }}>
            <a href="/simulate">← All machines</a>
          </p>
          <h1>{entry.title}</h1>
          <p className="tnt-prose tnt-lead tnt-mono">{entry.language}</p>
        </div>
        <p className="tnt-page-links">{entry.citation}</p>
      </div>

      {/* The triad: controller (state + engine), renderer (inside it), docs (its aside). */}
      <AutomatonController
        key={entry.id}
        machine={entry.machine}
        suggested={entry.suggested}
        initialInput={entry.suggested[0] ?? ''}
        aside={<AutomatonDocs machine={entry.machine} />}
      />
    </div>
  )
}
