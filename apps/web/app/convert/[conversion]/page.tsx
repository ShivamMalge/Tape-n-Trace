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
      <p className="tnt-sm" style={{ margin: 0 }}>
        <a href="/convert">← All conversions</a>
      </p>

      <h1 style={{ marginTop: 'var(--tnt-space-2)' }}>{found.title}</h1>
      <p className="tnt-prose" style={{ marginTop: 0 }}>{found.summary}</p>

      {found.enrichment === true ? (
        <p className="tnt-card tnt-prose tnt-sm">
          <strong>Beyond the syllabus.</strong> This topic is not in the prescribed text and is not
          examined on this course. It is here because it is worth knowing, not because you need it.
        </p>
      ) : null}

      <div
        className="tnt-stack-lg"
        style={{
          gridTemplateColumns: 'minmax(0, 3fr) minmax(220px, 1fr)',
          alignItems: 'start',
          marginTop: 'var(--tnt-space-4)',
        }}
      >
        <ConversionWorkbench key={found.id} conversionId={found.id} />

        <aside className="tnt-stack" style={{ alignContent: 'start' }}>
          <section className="tnt-card">
            <h2>How to read it</h2>
            <ul className="tnt-sm tnt-stack-sm" style={{ margin: 0, paddingLeft: 18 }}>
              {found.reading.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="tnt-card">
            <h2>Reference</h2>
            <p className="tnt-muted tnt-sm" style={{ margin: 0 }}>
              {found.citation}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
