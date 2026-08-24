'use client'

/**
 * The syllabus index — architecture.md §8, phases.md P1.7.
 *
 * Everything on this page is read out of `lib/schemes/` and `lib/topics.ts`.
 * Adding a university is a file in that directory and no change here, which is
 * the whole claim the scheme layer makes; `test/syllabus.test.tsx` holds it by
 * walking every scheme and failing on a topic that resolves to nothing.
 */

import { useState } from 'react'
import { SCHEMES, DEFAULT_SCHEME, topicsOf, type Scheme, type SchemeModule } from '../lib/schemes'
import { topicById } from '../lib/topics'
import { CATALOG } from '../lib/catalog'

export function SyllabusIndex(): React.JSX.Element {
  const [schemeId, setSchemeId] = useState(DEFAULT_SCHEME.id)
  const scheme = (SCHEMES.find((s) => s.id === schemeId) ?? DEFAULT_SCHEME) as Scheme

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {SCHEMES.length < 2 ? null : (
        <div role="group" aria-label="Scheme" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === scheme.id}
              onClick={() => setSchemeId(s.id)}
              style={{
                font: 'inherit',
                fontSize: 13,
                padding: '4px 12px',
                borderRadius: 999,
                border: s.id === scheme.id ? '1px solid var(--tnt-current)' : '1px solid var(--tnt-border)',
                background: s.id === scheme.id ? 'var(--tnt-current-soft)' : 'var(--tnt-bg)',
                color: 'var(--tnt-text)',
                cursor: 'pointer',
              }}
            >
              {s.code} · {s.institution.split(',')[0]}
            </button>
          ))}
        </div>
      )}

      <section className="tnt-card" style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 16 }}>
          {scheme.code} — {scheme.title}
        </strong>
        <span style={{ fontSize: 14 }}>{scheme.institution}</span>
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          {scheme.session} · {scheme.credits} credits · L:T:P:S = {scheme.ltps.join(':')}
        </span>
        <span className="tnt-muted" style={{ fontSize: 13 }}>
          Textbook: {scheme.textbook}
        </span>
        {scheme.ltps[1] === 0 && scheme.ltps[3] > 0 ? (
          <p style={{ margin: '6px 0 0', fontSize: 13, borderLeft: '3px solid var(--tnt-current)', paddingLeft: 8 }}>
            {scheme.ltps[0]} lecture hours, <strong>no tutorial hours</strong>, and {scheme.ltps[3]} self-study hours.
            More than half of a student’s time with this subject is unsupervised — which is the gap every trace in this
            app exists to fill.
          </p>
        ) : null}
      </section>

      {scheme.modules.map((module) => (
        <ModuleSection key={module.number} module={module} scheme={scheme} />
      ))}

      <section>
        <h2 style={{ fontSize: 18 }}>Course outcomes</h2>
        {scheme.outcomes.length === 0 ? (
          <p className="tnt-muted" style={{ fontSize: 14, maxWidth: '70ch' }}>
            {scheme.outcomesNote ?? 'Not recorded for this scheme.'}
          </p>
        ) : (
          <dl style={{ display: 'grid', gap: 8, margin: 0 }}>
            {scheme.outcomes.map((co) => (
              <div key={co.id} style={{ display: 'grid', gap: 1 }}>
                <dt style={{ fontSize: 13, fontWeight: 600 }}>
                  {co.id} <span className="tnt-muted" style={{ fontWeight: 400 }}>· Bloom level {co.level}</span>
                </dt>
                <dd style={{ margin: 0, fontSize: 14 }}>{co.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {scheme.tutorials.length === 0 ? null : (
        <section>
          <h2 style={{ fontSize: 18 }}>Tutorial components</h2>
          <p className="tnt-muted" style={{ fontSize: 13, maxWidth: '70ch', marginTop: 0 }}>
            The components the syllabus prescribes, and what delivers each. One is not built, and says so.
          </p>
          <ul style={{ display: 'grid', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
            {scheme.tutorials.map((tutorial) => {
              const topic = tutorial.topic === null ? undefined : topicById(tutorial.topic)
              return (
                <li key={tutorial.title} style={{ fontSize: 14 }}>
                  {tutorial.title} —{' '}
                  {topic === undefined ? (
                    <span className="tnt-muted">{tutorial.note ?? 'nothing delivers this yet.'}</span>
                  ) : (
                    <a href={topic.href}>{topic.title}</a>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {scheme.discrepancies.length === 0 ? null : (
        <section>
          <h2 style={{ fontSize: 18 }}>Where the source documents disagree</h2>
          <p className="tnt-muted" style={{ fontSize: 13, maxWidth: '70ch', marginTop: 0 }}>
            Recorded rather than quietly resolved. Worth one question to the course faculty before anything here is
            treated as settled.
          </p>
          <ul style={{ display: 'grid', gap: 6, paddingLeft: 20, margin: 0, fontSize: 14 }}>
            {scheme.discrepancies.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ModuleSection({ module, scheme }: { module: SchemeModule; scheme: Scheme }): React.JSX.Element {
  const topics = topicsOf(module)

  return (
    <section>
      <h2 style={{ fontSize: 18, marginBottom: 2 }}>
        Module {module.number} — {module.title}
      </h2>
      <p className="tnt-muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
        {module.hours} hours · Hopcroft 2e {module.sections}
        {module.co === '' ? '' : ` · ${module.co}`}
      </p>

      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
        {topics.map((topic) => {
          const tool = CATALOG.find((t) => t.href === topic.href)
          return (
            <li key={topic.id}>
              <a
                href={topic.href}
                className="tnt-card"
                style={{ display: 'grid', gap: 3, textDecoration: 'none', color: 'inherit', padding: 12 }}
              >
                <span style={{ fontSize: 15 }}>
                  {topic.title}{' '}
                  <span className="tnt-muted" style={{ fontSize: 12 }}>
                    {topic.sections.length === 0 ? '' : `§${topic.sections.join(', §')}`}
                  </span>
                </span>
                {tool === undefined ? null : (
                  <span className="tnt-muted" style={{ fontSize: 13 }}>
                    {tool.summary}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>

      {scheme.outcomes.find((co) => co.id === module.co) === undefined ? null : (
        <p className="tnt-muted" style={{ fontSize: 12, marginTop: 8, maxWidth: '70ch' }}>
          {module.co}: {scheme.outcomes.find((co) => co.id === module.co)?.text}
        </p>
      )}
    </section>
  )
}
