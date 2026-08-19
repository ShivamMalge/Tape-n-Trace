import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GALLERY, galleryEntry } from '@tape-n-trace/engine'
import { MachineEditor } from '../../../components/machine-editor'

interface PageProps {
  params: Promise<{ machine: string }>
}

export function generateStaticParams(): { machine: string }[] {
  return GALLERY.map((entry) => ({ machine: entry.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { machine } = await params
  const entry = galleryEntry(machine)
  return entry === undefined ? { title: 'Machine not found' } : { title: `Edit — ${entry.title}` }
}

export default async function EditMachinePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { machine } = await params
  const entry = galleryEntry(machine)
  if (entry === undefined) notFound()

  return (
    <div className="tnt-page">
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/edit">← Draw from scratch</a> · <a href={`/simulate/${entry.id}`}>Simulate this machine</a>
      </p>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>Edit — {entry.title}</h1>
      <p className="tnt-muted" style={{ maxWidth: '62ch', marginTop: 0 }}>
        Changes here stay in this tab. Export a <code>.tnt</code> file to keep them.
      </p>

      <MachineEditor key={entry.id} initial={entry.machine} />
    </div>
  )
}
