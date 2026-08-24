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
    <div className="tnt-stack-lg">
      {SCHEMES.length < 2 ? null : (
        <div role="group" aria-label="Scheme" className="tnt-row tnt-row-tight">
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="tnt-chip"
              aria-pressed={s.id === scheme.id}
              onClick={() => setSchemeId(s.id)}
            >
              {s.code} · {s.institution.split(',')[0]}
            </button>
          ))}
        </div>
      )}

      <section className="tnt-card tnt-stack-sm">
        <strong className="tnt-lg">
          {scheme.code} — {scheme.title}
        </strong>
        <span>{scheme.institution}</span>
        <span className="tnt-muted tnt-sm">
          {scheme.session} · {scheme.credits} credits · L:T:P:S = {scheme.ltps.join(':')}
        </span>
        <span className="tnt-muted tnt-sm">Textbook: {scheme.textbook}</span>
        {scheme.ltps[1] === 0 && scheme.ltps[3] > 0 ? (
          <p className="tnt-note" style={{ margin: 0 }}>
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
        <h2>Course outcomes</h2>
        {scheme.outcomes.length === 0 ? (
          <p className="tnt-muted tnt-prose">{scheme.outcomesNote ?? 'Not recorded for this scheme.'}</p>
        ) : (
          <dl className="tnt-stack-sm" style={{ margin: 0 }}>
            {scheme.outcomes.map((co) => (
              <div key={co.id} className="tnt-stack-sm">
                <dt className="tnt-sm" style={{ fontWeight: 600 }}>
                  {co.id}{' '}
                  <span className="tnt-muted" style={{ fontWeight: 400 }}>
                    · Bloom level {co.level}
                  </span>
                </dt>
                <dd style={{ margin: 0 }}>{co.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {scheme.tutorials.length === 0 ? null : (
        <section>
          <h2>Tutorial components</h2>
          <p className="tnt-muted tnt-sm tnt-prose" style={{ marginTop: 0 }}>
            The components the syllabus prescribes, and what delivers each. One is not built, and says so.
          </p>
          <ul className="tnt-stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {scheme.tutorials.map((tutorial) => {
              const topic = tutorial.topic === null ? undefined : topicById(tutorial.topic)
              return (
                <li key={tutorial.title}>
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
          <h2>Where the source documents disagree</h2>
          <p className="tnt-muted tnt-sm tnt-prose" style={{ marginTop: 0 }}>
            Recorded rather than quietly resolved. Worth one question to the course faculty before anything here is
            treated as settled.
          </p>
          <ul className="tnt-stack-sm" style={{ paddingLeft: 'var(--tnt-space-5)', margin: 0 }}>
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
      <h2 style={{ marginBottom: 2 }}>
        Module {module.number} — {module.title}
      </h2>
      <p className="tnt-meta" style={{ margin: '0 0 var(--tnt-space-3)' }}>
        {module.hours} hours · Hopcroft 2e {module.sections}
        {module.co === '' ? '' : ` · ${module.co}`}
      </p>

      <ul className="tnt-stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {topics.map((topic) => {
          const tool = CATALOG.find((t) => t.href === topic.href)
          return (
            <li key={topic.id}>
              <a href={topic.href} className="tnt-card tnt-stack-sm">
                <span>
                  {topic.title}{' '}
                  <span className="tnt-meta">
                    {topic.sections.length === 0 ? '' : `§${topic.sections.join(', §')}`}
                  </span>
                </span>
                {tool === undefined ? null : <span className="tnt-muted tnt-sm">{tool.summary}</span>}
              </a>
            </li>
          )
        })}
      </ul>

      {scheme.outcomes.find((co) => co.id === module.co) === undefined ? null : (
        <p className="tnt-meta tnt-prose" style={{ marginTop: 'var(--tnt-space-2)' }}>
          {module.co}: {scheme.outcomes.find((co) => co.id === module.co)?.text}
        </p>
      )}
    </section>
  )
}
