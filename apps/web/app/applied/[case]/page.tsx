import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { APPLIED, appliedCase } from '@tape-n-trace/engine'
import { AppliedCaseView } from '../../../components/applied-case'

interface PageProps {
  params: Promise<{ case: string }>
}

export function generateStaticParams(): { case: string }[] {
  return APPLIED.map((study) => ({ case: study.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { case: id } = await params
  const study = appliedCase(id)
  return study === undefined ? { title: 'Case study not found' } : { title: study.title }
}

export default async function AppliedCasePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { case: id } = await params
  const study = appliedCase(id)
  if (study === undefined) notFound()

  return (
    <div className="tnt-page">
      <p style={{ fontSize: 13, margin: 0 }}>
        <a href="/applied">← All case studies</a>
      </p>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>{study.title}</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
        {[study.co, study.bloom, study.sdg, `Module ${study.module}`].map((tag) => (
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

      <p style={{ maxWidth: '68ch' }}>{study.framing}</p>

      {study.id === 'keyword-search' ? (
        <p style={{ maxWidth: '62ch' }}>
          This one has a page of its own: <a href="/search">text and keyword search</a>.
        </p>
      ) : null}

      <AppliedCaseView caseId={study.id} />
    </div>
  )
}
