'use client'

/**
 * The containment rings — Fig. 9.2, and the classes inside it.
 *
 * Drawn as nested boxes because that is how the book draws it, and because
 * nesting is the claim: every regular language is context-free, every
 * context-free language is recursive, and so on outwards. Concentric circles
 * would say the same thing less legibly at six levels deep.
 *
 * One component serves two pages. `/undecidable` passes the three rings of
 * Fig. 9.2; `/hierarchy` passes all six. Languages are plotted in the innermost
 * ring that contains them, which is what makes the picture a claim about
 * *proper* containment rather than a stack of boxes.
 */

import { useState } from 'react'
import {
  CANONICAL_LANGUAGES,
  LANGUAGE_CLASSES,
  UNWITNESSED_SEPARATION,
  type CanonicalLanguage,
  type ClassId,
  type LanguageClass,
} from '@tape-n-trace/engine'
import { topicById } from '../lib/topics'

export function HierarchyRings({
  show,
  caption,
}: {
  /** Innermost first. Anything omitted is folded into the innermost ring shown. */
  show: ClassId[]
  caption: string
}): React.JSX.Element {
  const [open, setOpen] = useState<ClassId | null>(null)
  const rings = LANGUAGE_CLASSES.filter((c) => show.includes(c.id)).sort((a, b) => a.depth - b.depth)
  const innermost = rings[0]

  // Anything the caller left out is still true of the innermost ring shown, so
  // its languages are plotted there rather than dropped.
  const folded = new Set(LANGUAGE_CLASSES.filter((c) => !show.includes(c.id)).map((c) => c.id))
  const ringFor = (language: CanonicalLanguage): ClassId =>
    folded.has(language.ring) ? ((innermost?.id ?? language.ring) as ClassId) : language.ring

  // The outermost ring is the container, so the recursion starts at the end of
  // the list and works inwards. Drawing it the other way round would nest the
  // regular languages *outside* everything, which is the opposite claim.
  const build = (index: number): React.JSX.Element | null => {
    const ring = rings[index]
    if (ring === undefined) return null
    const languages = CANONICAL_LANGUAGES.filter((l) => ringFor(l) === ring.id)
    const isOpen = open === ring.id

    return (
      <div
        style={{
          border: `2px solid ${index === rings.length - 1 ? 'var(--tnt-text-muted)' : 'var(--tnt-current)'}`,
          borderRadius: 'var(--tnt-radius)',
          padding: 12,
          background: index % 2 === 0 ? 'var(--tnt-bg)' : 'var(--tnt-surface)',
          display: 'grid',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(isOpen ? null : ring.id)}
          aria-expanded={isOpen}
          style={{
            font: 'inherit',
            fontWeight: 600,
            fontSize: 14,
            textAlign: 'left',
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--tnt-text)',
            cursor: 'pointer',
            display: 'flex',
            gap: 8,
            alignItems: 'baseline',
          }}
        >
          <span>{ring.title}</span>
          <span className="tnt-muted" style={{ fontSize: 11, fontWeight: 400 }}>
            {ring.citation === null ? 'outside the prescribed sections' : `§${ring.citation}`} · {isOpen ? 'hide' : 'show'} detail
          </span>
        </button>

        {languages.length === 0 ? null : (
          <ul style={{ display: 'flex', gap: 6, flexWrap: 'wrap', listStyle: 'none', margin: 0, padding: 0 }}>
            {languages.map((language) => (
              <LanguageChip key={language.id} language={language} />
            ))}
          </ul>
        )}

        {ring.id === UNWITNESSED_SEPARATION.outer && rings.some((r) => r.id === UNWITNESSED_SEPARATION.inner) ? (
          <p className="tnt-muted" style={{ margin: 0, fontSize: 12, fontStyle: 'italic' }}>
            Nothing is plotted here. {UNWITNESSED_SEPARATION.why}
          </p>
        ) : null}

        {isOpen ? <ClassDetail ring={ring} /> : null}

        {build(index - 1)}
      </div>
    )
  }

  return (
    <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
      {build(rings.length - 1)}
      <figcaption className="tnt-muted" style={{ fontSize: 12 }}>
        {caption}
      </figcaption>
    </figure>
  )
}

function LanguageChip({ language }: { language: CanonicalLanguage }): React.JSX.Element {
  const topic = language.proofTopic === undefined ? undefined : topicById(language.proofTopic)
  const body = (
    <>
      <code style={{ fontSize: 12 }}>{language.notation}</code>
      <span className="tnt-muted" style={{ fontSize: 11 }}>
        {language.citation === null ? '' : ` §${language.citation}`}
      </span>
    </>
  )

  return (
    <li>
      {topic === undefined ? (
        <span style={chip} title={language.why}>
          {body}
        </span>
      ) : (
        <a href={topic.href} style={{ ...chip, textDecoration: 'none' }} title={`${language.why} — ${topic.title}`}>
          {body}
        </a>
      )}
    </li>
  )
}

function ClassDetail({ ring }: { ring: LanguageClass }): React.JSX.Element {
  const rows: [string, string | undefined][] = [
    ['Machine', ring.machine],
    ['Grammar', ring.grammar],
    ['Closure', ring.closure],
    ['Pumping lemma', ring.pumping],
    ['What can be decided', ring.decision],
  ]

  const tools = ring.topics.flatMap((id) => {
    const topic = topicById(id)
    return topic === undefined ? [] : [topic]
  })

  return (
    <div className="tnt-card" style={{ display: 'grid', gap: 8, background: 'var(--tnt-bg)' }}>
      <dl style={{ display: 'grid', gap: 6, margin: 0 }}>
        {rows.map(([term, value]) =>
          value === undefined ? null : (
            <div key={term} style={{ display: 'grid', gap: 1 }}>
              <dt className="tnt-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {term}
              </dt>
              <dd style={{ margin: 0, fontSize: 13 }}>{value}</dd>
            </div>
          ),
        )}
      </dl>

      {ring.citation === null ? (
        <p className="tnt-muted" style={{ margin: 0, fontSize: 12, fontStyle: 'italic' }}>
          The prescribed sections do not cover this class, so no section is cited for it. It is on the map because the
          syllabus’s own tutorial component — language classification across regular, CFL, CSL, recursive and RE — names
          it.
        </p>
      ) : null}

      {tools.length === 0 ? null : (
        <p style={{ margin: 0, fontSize: 13 }}>
          Work in this class:{' '}
          {tools.map((topic, n) => (
            <span key={topic.id}>
              {n > 0 ? ' · ' : ''}
              <a href={topic.href}>{topic.title}</a>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

const chip: React.CSSProperties = {
  display: 'inline-flex',
  gap: 4,
  alignItems: 'baseline',
  padding: '3px 8px',
  borderRadius: 999,
  border: '1px solid var(--tnt-border)',
  background: 'var(--tnt-bg)',
  color: 'var(--tnt-text)',
}
