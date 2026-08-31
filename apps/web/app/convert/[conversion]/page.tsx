import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONVERSIONS, conversionById } from '../../../lib/conversions'
import { ConversionWorkbench } from '../../../components/conversion-workbench'
import { DocsCard } from '../../../components/docs-card'

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
      <div className="tnt-page-head">
        <div>
          <p className="tnt-meta" style={{ margin: '0 0 6px' }}>
            <a href="/convert">← All conversions</a>
          </p>
          <h1>{found.title}</h1>
          <p className="tnt-prose tnt-lead">{found.summary}</p>
        </div>
        <p className="tnt-page-links">{found.citation}</p>
      </div>

      {found.enrichment === true ? (
        <div className="tnt-banner tnt-banner-info" style={{ marginBottom: 22 }}>
          <span className="tnt-banner-headline">Beyond the syllabus</span>
          <span className="tnt-banner-detail">
            This topic is not in the prescribed text and is not examined on this course. It is here because it is
            worth knowing, not because you need it.
          </span>
        </div>
      ) : null}

      <ConversionWorkbench
        key={found.id}
        conversionId={found.id}
        docs={
          <DocsCard title="How to read it" cite={found.citation}>
            <ul className="tnt-docs-list">
              {found.reading.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </DocsCard>
        }
      />
    </div>
  )
}
