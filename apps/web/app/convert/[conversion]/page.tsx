import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONVERSIONS, conversionById } from '../../../lib/conversions'
import { ConversionWorkbench } from '../../../components/conversion-workbench'

interface PageProps {
  params: Promise<{ conversion: string }>
}

export function generateStaticParams(): { conversion: string }[] {
  return CONVERSIONS.map((c) => ({ conversion: c.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { conversion } = await params
  const found = conversionById(conversion)
  return found === undefined
    ? { title: 'Conversion not found' }
    : { title: found.title, description: found.summary }
}

export default async function ConversionPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { conversion } = await params
  const found = conversionById(conversion)
  if (found === undefined) notFound()

  return (
    <div className="tnt-page">
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/convert">← All conversions</a>
      </p>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>{found.title}</h1>
      <p style={{ maxWidth: '62ch', marginTop: 0 }}>{found.summary}</p>

      {found.enrichment === true ? (
        <p
          style={{
            maxWidth: '62ch',
            fontSize: 13,
            padding: '8px 12px',
            borderRadius: 'var(--tnt-radius)',
            border: '1px solid var(--tnt-border)',
            background: 'var(--tnt-surface)',
          }}
        >
          <strong>Beyond the syllabus.</strong> This topic is not in the prescribed text and is not
          examined on this course. It is here because it is worth knowing, not because you need it.
        </p>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'minmax(0, 3fr) minmax(220px, 1fr)',
          alignItems: 'start',
          marginTop: 16,
        }}
      >
        <ConversionWorkbench key={found.id} conversionId={found.id} />

        <aside style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <section className="tnt-card">
            <h2 style={{ fontSize: 15, marginTop: 0 }}>How to read it</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: 'grid', gap: 6 }}>
              {found.reading.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="tnt-card">
            <h2 style={{ fontSize: 15, marginTop: 0 }}>Reference</h2>
            <p className="tnt-muted" style={{ fontSize: 13, margin: 0 }}>
              {found.citation}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
