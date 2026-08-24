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
      <p className="tnt-sm" style={{ margin: 0 }}>
        <a href="/applied">← All case studies</a>
      </p>

      <h1 style={{ marginTop: 'var(--tnt-space-2)' }}>{study.title}</h1>

      <div className="tnt-row" style={{ margin: '0 0 var(--tnt-space-3)' }}>
        {[study.co, study.bloom, study.sdg, `Module ${study.module}`].map((tag) => (
          <span key={tag} className="tnt-tag">
            {tag}
          </span>
        ))}
      </div>

      <p className="tnt-prose">{study.framing}</p>

      {study.id === 'keyword-search' ? (
        <p className="tnt-prose">
          This one has a page of its own: <a href="/search">text and keyword search</a>.
        </p>
      ) : null}

      <AppliedCaseView caseId={study.id} />
    </div>
  )
}
